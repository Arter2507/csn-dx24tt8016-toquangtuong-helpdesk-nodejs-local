import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { seedSampleFaq } from './seed-faq.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Dữ liệu mẫu chỉ được nhập trong môi trường phát triển.');
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sqlPath = join(root, 'sql', 'helpdesk-sample-data.sql');
const sql = await readFile(sqlPath, 'utf8');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  const [[{ hasData }]] = await connection.query(`SELECT
    EXISTS(SELECT id FROM users) OR EXISTS(SELECT id FROM categories) OR
    EXISTS(SELECT id FROM roles) AS hasData`);
  if (hasData) throw new Error('Cần một cơ sở dữ liệu đã migrate và chưa có dữ liệu mẫu.');
  await connection.query(sql);
  await seedSampleFaq(connection);
  const [rows] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(*) FROM tickets) AS tickets,
      (SELECT COUNT(*) FROM ticket_events) AS events
  `);
  console.log('Imported sample data:', rows[0]);
} finally {
  await connection.end();
}
