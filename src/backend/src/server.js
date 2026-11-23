import { app } from './app.js';
import { config } from './configs/env.js';
if (!['demo', 'mysql'].includes(config.dataSource)) throw new Error('DATA_SOURCE phải là demo hoặc mysql');
const server = app.listen(config.port, '127.0.0.1');
server.once('listening', () => {
  console.log('Helpdesk API đang chạy tại cổng ' + config.port);
  process.send?.('ready');
});
server.on('error', error => {
  console.error('Không thể mở API tại cổng ' + config.port + ' (' + (error.code ?? error.message) + ').');
  process.exitCode = 1;
  if (process.connected) process.disconnect();
});
