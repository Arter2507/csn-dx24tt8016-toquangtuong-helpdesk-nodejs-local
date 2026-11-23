import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

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
  await connection.query(sql);
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
