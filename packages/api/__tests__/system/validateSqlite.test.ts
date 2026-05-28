import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { FieldValidationError } from '../../src/middleware/errors.js';
import {
  assertValidSqliteBuffer,
  isValidSqliteBuffer,
  validateRestorableDatabaseFile,
} from '../../src/system/validateSqlite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(path.resolve(__dirname, '../..'), 'src/migrations');

describe('isValidSqliteBuffer', () => {
  it('rejects short buffers', () => {
    expect(isValidSqliteBuffer(Buffer.from('short'))).toBe(false);
  });

  it('rejects random bytes', () => {
    expect(isValidSqliteBuffer(Buffer.alloc(200, 0xab))).toBe(false);
  });

  it('accepts sqlite magic header', () => {
    const buffer = Buffer.alloc(200, 0);
    Buffer.from('SQLite format 3\0').copy(buffer, 0);
    expect(isValidSqliteBuffer(buffer)).toBe(true);
  });
});

describe('assertValidSqliteBuffer', () => {
  it('throws FieldValidationError for invalid buffer', () => {
    expect(() => assertValidSqliteBuffer(Buffer.alloc(10))).toThrow(FieldValidationError);
  });
});

describe('validateRestorableDatabaseFile', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('accepts a migrated app database file', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-db-'));
    const dbFile = path.join(tmpDir, 'valid.db');
    const sqlite = new Database(dbFile);
    const database = drizzle(sqlite);
    migrate(database, { migrationsFolder });
    sqlite.close();

    expect(() => validateRestorableDatabaseFile(dbFile)).not.toThrow();
  });

});
