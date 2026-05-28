import { closeDatabase, createConnection, dbPath, type Database } from './db.js';
import { createRepo, type Repo } from './repo.js';

export type AppState = {
  getDb: () => Database;
  getRepo: () => Repo;
  getDatabasePath: () => string;
  reconnect: (databaseUrl?: string) => void;
};

export function createAppState(
  initialDb: Database,
  initialDatabasePath: string = dbPath
): AppState {
  let db = initialDb;
  let repo = createRepo(db);
  let databaseFilePath = initialDatabasePath;

  return {
    getDb: () => db,
    getRepo: () => repo,
    getDatabasePath: () => databaseFilePath,
    reconnect: (databaseUrl?: string) => {
      closeDatabase(db);
      if (databaseUrl) {
        databaseFilePath = databaseUrl;
      }
      db = createConnection(databaseFilePath);
      repo = createRepo(db);
    },
  };
}
