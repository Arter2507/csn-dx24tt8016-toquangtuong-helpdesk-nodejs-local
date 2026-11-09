import { app } from './app.js';
import { config } from './configs/env.js';
if (!['demo', 'mysql'].includes(config.dataSource)) throw new Error('DATA_SOURCE phải là demo hoặc mysql');
app.listen(config.port, '127.0.0.1', () => console.log('Helpdesk API đang chạy tại cổng ' + config.port));
