import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const directory = fileURLToPath(new URL('../docker/', import.meta.url));
const compose = ['compose', '-f', 'compose.yaml'];
const action = process.argv[2];

function docker(args, options = {}) {
  return spawnSync('docker', args, { cwd: directory, encoding: 'utf8', ...options });
}

function resultText(result) {
  return result.status === 0 ? result.stdout.trim() : null;
}

function run(args) {
  const result = docker(args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function engine() {
  return resultText(docker(['info', '--format', '{{.OperatingSystem}}']));
}

function desktopContext() {
  const endpoint = process.env.DOCKER_HOST ??
    resultText(docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']));
  return !!endpoint && /^(npipe:\/\/.*dockerDesktop(?:Linux|Windows)Engine|unix:\/\/.*\/\.docker\/run\/docker\.sock)$/i.test(endpoint);
}

function startEngine() {
  if (engine()) return;
  if (desktopContext() && docker(['desktop', 'version']).status === 0) {
    run(['desktop', 'start', '--timeout', '120']);
    if (engine()) return;
  }
  throw new Error('Docker Engine chưa sẵn sàng. Hãy mở Docker Desktop hoặc khởi động Docker Engine rồi thử lại.');
}

function configureMysql() {
  const env = join(directory, '.env');
  if (existsSync(env)) return;
  const secret = () => randomBytes(32).toString('hex');
  try {
    writeFileSync(env, [
      'MYSQL_DATABASE=helpdesk',
      'MYSQL_USER=helpdesk_app',
      'MYSQL_PASSWORD=' + secret(),
      'MYSQL_ROOT_PASSWORD=' + secret(),
      'JWT_SECRET=' + secret(),
      'MYSQL_SEED_SAMPLE=true',
      '',
    ].join('\n'), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

function stop() {
  const activeEngine = engine();
  if (!activeEngine) {
    if (desktopContext()) {
      const status = docker(['desktop', 'status', '--format', 'json']);
      const stopped = /"status"\s*:\s*"stopped"/i.test(status.stdout ?? '') ||
        /Could not retrieve status\. Is Docker Desktop running\?/i.test(status.stderr ?? '');
      if (stopped) {
        console.log('Docker Desktop đã dừng.');
        return;
      }
    }
    throw new Error('Không kết nối được Docker để dừng các dịch vụ.');
  }

  configureMysql();
  run([...compose, 'down', '--remove-orphans']);
  if (!desktopContext() || !activeEngine.includes('Docker Desktop')) return;

  const other = resultText(docker(['ps', '-q']));
  if (other === null) throw new Error('Không kiểm tra được các container còn hoạt động.');
  if (other) {
    console.log('Đã dừng Trạm Mèo. Docker Desktop đang phục vụ container khác.');
    return;
  }
  run(['desktop', 'stop', '--timeout', '60']);
}

try {
  if (action === 'stop') {
    stop();
  } else if (action === 'dev' || action === 'build' || action === 'check') {
    startEngine();
    configureMysql();
    if (action === 'dev') {
      // Keep Compose's interactive shortcuts from toggling watch or detaching.
      process.env.COMPOSE_MENU = 'false';
      run([...compose, 'up', '--build', '--remove-orphans', '--watch']);
    } else if (action === 'build') {
      run([...compose, 'build']);
    } else {
      run([...compose, 'build']);
      for (const service of ['backend', 'frontend']) {
        run([...compose, 'run', '--rm', '--no-deps', service, 'pnpm', 'typecheck:lint']);
      }
    }
  } else {
    throw new Error('Lệnh Docker không hợp lệ.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
