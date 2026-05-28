import path from 'path';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { Database } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '../..');

export const migrationsFolder = path.join(packageDir, 'src/migrations');

export function runMigrations(database: Database): void {
  migrate(database, { migrationsFolder });
}
