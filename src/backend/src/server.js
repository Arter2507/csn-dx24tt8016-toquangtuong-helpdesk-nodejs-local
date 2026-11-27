import { app } from './app.js';
import { config } from './configs/env.js';
import { warnUpcomingSla } from './modules/notifications/sla-warnings.js';
import { deliverStatusMail } from './modules/notifications/outgoing-mail.js';
import { runBackgroundWrite } from './modules/backups/maintenance.js';
if (!['demo', 'mysql'].includes(config.dataSource)) throw new Error('DATA_SOURCE phải là demo hoặc mysql');
if (process.env.NODE_ENV === 'production') {
  const origin = new URL(config.auth.origin);
  if (config.dataSource !== 'mysql' || config.auth.secret.length < 32 ||
      origin.protocol !== 'https:' || origin.origin !== config.auth.origin) {
    throw new Error('Production cần MySQL, JWT_SECRET tối thiểu 32 ký tự và CORS_ORIGIN là origin HTTPS.');
  }
}
const server = app.listen(config.port, config.host);
server.once('listening', () => {
  console.log('Helpdesk API đang chạy tại cổng ' + config.port);
  process.send?.('ready');
  if (config.dataSource === 'mysql') {
    for (const job of [warnUpcomingSla, deliverStatusMail]) {
      let running = false;
      const run = async () => {
        if (running) return;
        running = true;
        try {
          await runBackgroundWrite(job);
        } catch (error) {
          console.error('Lỗi tác vụ thông báo', job.name, error.code ?? 'NOTIFICATION_ERROR');
        } finally {
          running = false;
        }
      };
      void run();
      const timer = setInterval(run, 15000);
      timer.unref();
      server.once('close', () => clearInterval(timer));
    }
  }
});
server.on('error', error => {
  console.error('Không thể mở API tại cổng ' + config.port + ' (' + (error.code ?? error.message) + ').');
  process.exitCode = 1;
  if (process.connected) process.disconnect();
});
