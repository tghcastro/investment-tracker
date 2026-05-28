import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, describe, expect, it } from 'vitest';

import { createAppState } from '../src/appState.js';
import { closeDatabase, createConnection } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const migrationsFolder = path.join(packageDir, 'src/migrations');

describe('createAppState', () => {
  let tmpDir: string;
  let dbFile: string;
  let state: ReturnType<typeof createAppState>;

  afterEach(() => {
    if (state) {
      closeDatabase(state.getDb());
    }
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('reconnect yields new repo that reads persisted file data', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-state-'));
    dbFile = path.join(tmpDir, 'test.db');
    const database = createConnection(dbFile);
    migrate(database, { migrationsFolder });

    state = createAppState(database, dbFile);
    const repoBefore = state.getRepo();
    const inserted = await repoBefore.insertAccount({
      name: 'Persisted Account',
      description: 'survives reconnect',
    });

    state.reconnect(dbFile);

    const repoAfter = state.getRepo();
    expect(repoAfter).not.toBe(repoBefore);

    const retrieved = await repoAfter.getAccount(inserted.id);
    expect(retrieved).toMatchObject({
      id: inserted.id,
      name: 'Persisted Account',
      description: 'survives reconnect',
    });
  });
});
