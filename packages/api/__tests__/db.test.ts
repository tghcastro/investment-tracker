import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  checkpointWal,
  closeDatabase,
  createConnection,
  getDatabaseDirectory,
} from '../src/db.js';

function getSqliteClient(database: ReturnType<typeof createConnection>) {
  return (
    database.session as {
      client: {
        open: boolean;
        exec: (sql: string) => void;
        pragma: (name: string) => unknown;
      };
    }
  ).client;
}

describe('getDatabaseDirectory', () => {
  it('returns dirname of resolved absolute path', () => {
    expect(getDatabaseDirectory('/var/lib/investment/data.db')).toBe(
      '/var/lib/investment'
    );
  });

  it('resolves relative paths against cwd', () => {
    const expected = path.dirname(path.resolve('data/sub.db'));
    expect(getDatabaseDirectory('data/sub.db')).toBe(expected);
  });
});

describe('closeDatabase', () => {
  let database: ReturnType<typeof createConnection>;

  afterEach(() => {
    if (database) {
      closeDatabase(database);
    }
  });

  it('closes an open connection', () => {
    database = createConnection(':memory:');
    const client = getSqliteClient(database);
    expect(client.open).toBe(true);

    closeDatabase(database);

    expect(client.open).toBe(false);
  });

  it('is safe to call when already closed', () => {
    database = createConnection(':memory:');
    closeDatabase(database);
    expect(() => closeDatabase(database)).not.toThrow();
  });
});

describe('checkpointWal', () => {
  let tmpDir: string;
  let database: ReturnType<typeof createConnection>;

  afterEach(() => {
    if (database) {
      closeDatabase(database);
    }
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('truncates WAL after writes on a file-backed database', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-lifecycle-'));
    const dbFile = path.join(tmpDir, 'test.db');
    database = createConnection(dbFile);
    const client = getSqliteClient(database);

    client.exec('CREATE TABLE t (id INTEGER)');
    client.exec('INSERT INTO t VALUES (1)');

    const before = client.pragma('wal_checkpoint') as Array<{
      busy: number;
      log: number;
      checkpointed: number;
    }>;
    expect(before[0].log).toBeGreaterThan(0);

    checkpointWal(database);

    const after = client.pragma('wal_checkpoint') as Array<{
      busy: number;
      log: number;
      checkpointed: number;
    }>;
    expect(after[0].log).toBe(0);
    expect(after[0].checkpointed).toBe(0);
  });
});
