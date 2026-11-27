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
  notifications: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    mailFrom: process.env.MAIL_FROM || '',
    mailLanguage: process.env.MAIL_LANGUAGE || 'vi',
    inboundToken: process.env.INBOUND_MAIL_TOKEN || '',
    inboundCategoryId: Number(process.env.INBOUND_MAIL_CATEGORY_ID || 0),
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  database: { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME || 'helpdesk', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', timezone: 'Z' }
};
