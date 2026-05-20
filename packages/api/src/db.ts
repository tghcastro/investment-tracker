import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

export const dbPath = process.env.DATABASE_URL ?? path.join(packageDir, 'data.db');

export function createConnection(databaseUrl: string = dbPath) {
  const sqlite = new Database(databaseUrl);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite);
}

export const db = createConnection();

export type Database = typeof db;

export default db;
