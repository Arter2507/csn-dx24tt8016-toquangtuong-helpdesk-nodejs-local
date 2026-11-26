import 'dotenv/config';

const refreshDays = Number(process.env.REFRESH_TOKEN_DAYS || 7);
export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  dataSource: process.env.DATA_SOURCE || 'mysql',
  auth: {
    secret: process.env.JWT_SECRET || '',
    origin: process.env.CORS_ORIGIN || 'http://127.0.0.1:4200',
    secureCookies: process.env.NODE_ENV === 'production',
    refreshDays,
  },
  backupDir: process.env.BACKUP_DIR || './backups',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  database: { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME || 'helpdesk', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', timezone: 'Z' }
};
