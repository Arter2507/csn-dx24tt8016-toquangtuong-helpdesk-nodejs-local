import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const mode = process.argv[2];
const backend = fileURLToPath(new URL('../src/backend/', import.meta.url));
const frontend = fileURLToPath(new URL('../src/frontend/', import.meta.url));
const angular = 'node_modules/@angular/cli/bin/ng.js';

if (!existsSync(join(backend, 'node_modules/express/package.json')) ||
    !existsSync(join(frontend, angular))) {
  console.error('Cần cài thư viện trong src/backend và src/frontend trước. Xem README.local.md.');
  process.exit(1);
}

const children = new Set();
let stopping = false;
let startup;

function stop(code) {
  if (stopping) return;
  stopping = true;
  clearTimeout(startup);
  process.exitCode = code;
  for (const child of children) child.kill();
}

function start(label, cwd, args, env, ipc = false) {
  const child = spawn(process.execPath, args, {
    cwd, env, stdio: ipc ? ['inherit', 'inherit', 'inherit', 'ipc'] : 'inherit',
  });
  children.add(child);
  child.once('error', error => {
    console.error(label + ' không khởi động được.', error.message);
    stop(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(label + ' đã dừng (' + (code ?? signal) + ').');
      stop(code || 1);
    }
  });
  return child;
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
console.log('Trạm Mèo · ' + mode + ' · mở http://127.0.0.1:4200/');

const api = start('API', backend, ['src/server.js'], {
  ...process.env, DATA_SOURCE: mode, PORT: '3000',
}, true);
startup = setTimeout(() => {
  console.error('API chưa sẵn sàng sau 15 giây.');
  stop(1);
}, 15_000);
api.on('message', message => {
  if (message !== 'ready' || stopping) return;
  clearTimeout(startup);
  const env = { ...process.env, NG_FORCE_TTY: '0' };
  delete env.PORT;
  start('Giao diện', frontend, [angular, 'serve', '--host', '127.0.0.1', '--port', '4200'], env);
});
