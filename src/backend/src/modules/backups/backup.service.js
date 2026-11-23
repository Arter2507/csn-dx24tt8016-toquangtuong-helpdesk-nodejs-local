import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import yazl from 'yazl';
import { config } from '../../configs/env.js';
import { AppError } from '../../shared/errors.js';
import { duringRestore } from './maintenance.js';
import { restoreArchive } from './restore.js';
import { collectBackupData } from './backup-data.js';

const databaseKey = createHash('sha256').update(JSON.stringify([
  config.database.host, config.database.port, config.database.database,
])).digest('hex').slice(0, 20);
const directory = resolve(config.backupDir, config.dataSource === 'mysql' ? 'mysql-' + databaseKey : 'demo');
const indexPath = join(directory, 'index.json');
const intervalMs = 60_000;
const workingStatuses = new Set(['queued', 'collecting', 'packing']);
const defaultSchedule = { enabled: false, intervalMinutes: 1440, nextAt: null };
let state;
let writes = Promise.resolve();

async function persist(next) {
  const pending = indexPath + '.part';
  await writeFile(pending, JSON.stringify(next), { mode: 0o600 });
  await rename(pending, indexPath);
  state = next;
}

async function initialize() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    const stored = JSON.parse(await readFile(indexPath, 'utf8'));
    state = stored;
    if (stored.jobs.some(job => workingStatuses.has(job.status))) {
      const jobs = stored.jobs.map(job => workingStatuses.has(job.status)
        ? { ...job, status: 'failed', error: 'interrupted', finishedAt: new Date().toISOString() }
        : job);
      await persist({ ...stored, jobs });
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = { jobs: [], schedules: {} };
  }
}

function transact(operation) {
  const run = writes.then(async () => {
    if (!state) await initialize();
    return operation();
  });
  writes = run.catch(() => {});
  return run;
}

const filePath = id => join(directory, id + '.zip');
const activeJob = () => state.jobs.find(job => workingStatuses.has(job.status));

function changeJob(id, fields) {
  return transact(() => persist({
    ...state,
    jobs: state.jobs.map(job => job.id === id ? { ...job, ...fields } : job),
  }));
}

async function archiveFiles(destination, snapshot, files) {
  for (const file of files) {
    if (!file.path || !await stat(file.path).then(info => info.isFile()).catch(() => false)) {
      throw new AppError(500, 'BACKUP_MISSING_FILE', 'Thiếu tệp đính kèm để tạo bản sao');
    }
  }
  const zip = new yazl.ZipFile();
  const finished = pipeline(zip.outputStream, createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
  zip.on('error', error => zip.outputStream.destroy(error));
  try {
    zip.addBuffer(Buffer.from(JSON.stringify(snapshot, null, 2)), 'data.json');
    for (const file of files) zip.addFile(file.path, file.name);
    zip.end();
  } catch (error) {
    zip.outputStream.destroy(error);
  }
  await finished;
}

async function runJob(job) {
  const destination = filePath(job.id);
  const pending = destination + '.part';
  try {
    await changeJob(job.id, { status: 'collecting' });
    const { snapshot, files } = await collectBackupData();
    await changeJob(job.id, { status: 'packing' });
    await archiveFiles(pending, snapshot, files);
    const { size } = await stat(pending);
    await rename(pending, destination);
    await changeJob(job.id, { status: 'completed', size, finishedAt: new Date().toISOString() });
  } catch (error) {
    await Promise.allSettled([unlink(pending), unlink(destination)]);
    const failure = {
      status: 'failed',
      error: error.code === 'BACKUP_MISSING_FILE' ? 'missing_file' : 'write',
      finishedAt: new Date().toISOString(),
    };
    try {
      await changeJob(job.id, failure);
    } catch (persistError) {
      console.error('Không lưu được trạng thái sao lưu:', persistError.code ?? persistError.name);
      await transact(() => {
        state = { ...state, jobs: state.jobs.map(item => item.id === job.id ? { ...item, ...failure } : item) };
      });
    }
    console.error('Sao lưu không thành công:', error.code ?? error.name);
  }
}

async function enqueue(kind, schedules = state.schedules, background = true) {
  const now = new Date();
  const id = randomUUID();
  const job = {
    id, kind, createdAt: now.toISOString(), finishedAt: null, status: 'queued', size: null, error: null,
    filename: 'tram-meo-' + config.dataSource + '-' + now.toISOString().slice(0, 19).replaceAll(':', '-') + '-' + id.slice(0, 8) + '.zip',
  };
  await persist({ schedules, jobs: [job, ...state.jobs] });
  if (background) void runJob(job);
  return job;
}

export const backups = {
  index(accountId) {
    return transact(() => ({
      jobs: state.jobs.slice(0, 50), schedule: state.schedules[accountId] ?? defaultSchedule,
    }));
  },

  manual() {
    return transact(() => activeJob() ?? enqueue('manual'));
  },

  saveSchedule(accountId, input) {
    return transact(async () => {
      const previous = state.schedules[accountId] ?? defaultSchedule;
      const changed = input.enabled !== previous.enabled || input.intervalMinutes !== previous.intervalMinutes;
      const nextAt = input.enabled
        ? (changed ? new Date().toISOString() : previous.nextAt)
        : null;
      const schedule = { ...input, nextAt };
      await persist({ ...state, schedules: { ...state.schedules, [accountId]: schedule } });
      return schedule;
    });
  },

  checkSchedule(accountId) {
    return transact(() => {
      const schedule = state.schedules[accountId];
      if (!schedule?.enabled || Date.parse(schedule.nextAt) > Date.now() || activeJob()) return null;
      const nextAt = new Date(Date.now() + schedule.intervalMinutes * intervalMs).toISOString();
      return enqueue('automatic', { ...state.schedules, [accountId]: { ...schedule, nextAt } });
    });
  },

  restore(id) {
    return duringRestore(async () => {
      const { path } = await this.download(id);
      const safety = await transact(() => {
        if (activeJob()) throw new AppError(409, 'RESTORE_BUSY', 'Đợi sao lưu hiện tại hoàn tất');
        return enqueue('pre_restore', state.schedules, false);
      });
      await runJob(safety);
      await this.download(safety.id).catch(() => {
        throw new AppError(409, 'RESTORE_SAFETY', 'Không tạo được bản sao trước khi khôi phục');
      });
      return { ...await restoreArchive(path), safetyBackupId: safety.id };
    });
  },

  download(id) {
    return transact(() => {
      const job = state.jobs.find(item => item.id === id && item.status === 'completed');
      if (!job) throw new AppError(404, 'NOT_FOUND', 'Chưa có bản sao để tải xuống');
      return { path: filePath(job.id), filename: job.filename };
    });
  },
};
