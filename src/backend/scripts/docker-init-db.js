import { spawnSync } from 'node:child_process';
import { pool } from '../src/database/pool.js';
import { config } from '../src/configs/env.js';
import { seedReviewData } from './seed-review-data.js';

const db = config.database;
const databaseUrl = new URL('mysql://' + db.host + ':' + db.port);
databaseUrl.username = encodeURIComponent(db.user);
databaseUrl.password = encodeURIComponent(db.password);
databaseUrl.pathname = '/' + encodeURIComponent(db.database);

const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: databaseUrl.href },
  stdio: 'inherit',
});
if (migration.error) throw migration.error;
if (migration.status !== 0) process.exit(migration.status ?? 1);

if (process.env.NODE_ENV !== 'production' && process.env.MYSQL_SEED_SAMPLE === 'true') {
  try {
    const [[result]] = await pool.query(`SELECT
      EXISTS(SELECT id FROM users) OR
      EXISTS(SELECT id FROM roles) OR
      EXISTS(SELECT id FROM categories) AS hasData`);
    if (!result.hasData) await import('./import-sample-data.js');
    await seedReviewData();
  } finally {
    await pool.end();
  }
}
