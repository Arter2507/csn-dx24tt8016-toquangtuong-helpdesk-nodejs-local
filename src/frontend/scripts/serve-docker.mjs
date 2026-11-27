import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { stripVTControlCharacters } from 'node:util';

const angular = spawn(process.execPath, [
  'node_modules/@angular/cli/bin/ng.js', 'serve', '--host', '0.0.0.0', '--port', '4200',
  '--proxy-config', 'proxy.docker.conf.json', '--poll', '1000', '--live-reload', '--hmr',
], { stdio: ['inherit', 'pipe', 'inherit'] });
const port = process.env.DEV_PUBLIC_PORT || '4200';
angular.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
angular.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => angular.kill(signal));
for await (const line of createInterface({ input: angular.stdout })) {
  const plain = stripVTControlCharacters(line);
  if (/^\s*(?:➜\s*)?Local:\s+http/.test(plain)) {
    console.log('  ➜  Local:   http://localhost:' + port + '/');
    console.log('  ➜  Network: http://127.0.0.1:' + port + '/');
  }
  else if (!/^\s*(?:➜\s*)?Network:\s+http/.test(plain)) console.log(line);
}
