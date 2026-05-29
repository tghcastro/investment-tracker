import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

export const dbPath = process.env.DATABASE_URL ?? path.join(packageDir, 'data.db');

export function createConnection(databaseUrl: string = dbPath) {
  const sqlite = new BetterSqlite3(databaseUrl);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite);
}

export type Database = ReturnType<typeof createConnection>;

let defaultDb: Database | undefined;

/** Lazy default connection — avoids opening SQLite when tests import server/seed graphs. */
export function getDefaultDb(): Database {
  if (!defaultDb) {
    defaultDb = createConnection();
  }
  return defaultDb;
}

/** Default app DB (lazy via proxy so module import does not lock data.db). */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const conn = getDefaultDb() as unknown as Record<string | symbol, unknown>;
    const value = conn[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(conn);
    }
    return value;
  },
});

type DatabaseWithSession = Database & {
  session: { client: BetterSqlite3.Database };
};

export function getSqliteClient(database: Database): BetterSqlite3.Database {
  return (database as DatabaseWithSession).session.client;
}

export function getDatabaseDirectory(dbFilePath: string): string {
  return path.dirname(path.resolve(dbFilePath));
}

export function closeDatabase(database: Database): void {
  const client = getSqliteClient(database);
  if (client.open) {
    client.close();
  }
  if (database === defaultDb) {
    defaultDb = undefined;
  }
}

export function checkpointWal(database: Database): void {
  getSqliteClient(database).pragma('wal_checkpoint(TRUNCATE)');
}

export default db;
