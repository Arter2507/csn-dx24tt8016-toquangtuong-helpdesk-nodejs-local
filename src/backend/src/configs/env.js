import 'dotenv/config';
export const config = {
  port: Number(process.env.PORT || 3000),
  dataSource: process.env.DATA_SOURCE || 'demo',
  database: { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME || 'helpdesk', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', timezone: 'Z' }
};
