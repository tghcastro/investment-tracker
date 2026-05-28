import { closeDatabase, createConnection, type Database } from './db.js';
import { createRepo, type Repo } from './repo.js';

export type AppState = {
  getDb: () => Database;
  getRepo: () => Repo;
  reconnect: (databaseUrl?: string) => void;
};

export function createAppState(initialDb: Database): AppState {
  let db = initialDb;
  let repo = createRepo(db);

  return {
    getDb: () => db,
    getRepo: () => repo,
    reconnect: (databaseUrl?: string) => {
      closeDatabase(db);
      db = databaseUrl ? createConnection(databaseUrl) : createConnection();
      repo = createRepo(db);
    },
  };
}
