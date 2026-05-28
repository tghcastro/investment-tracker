import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fixtureAccountDefs,
  fixtureBondDefs,
} from '../src/fixtures/seed.js';
import { createRepo } from '../src/repo.js';
import { createAppState } from '../src/appState.js';
import { createServer } from '../src/server.js';
import { ConflictError } from '../src/middleware/errors.js';
import { restoreDatabaseFromUpload } from '../src/system/restore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const migrationsFolder = path.join(packageDir, 'src/migrations');

const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');

async function createFileDatabase() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'system-api-'));
  const dbFile = path.join(tmpDir, 'test.db');
  const sqlite = new Database(dbFile);
  sqlite.pragma('foreign_keys = ON');
  const database = drizzle(sqlite);
  migrate(database, { migrationsFolder });
  return { tmpDir, dbFile, database, sqlite };
}

async function seedFixtures(database: ReturnType<typeof drizzle>) {
  const repo = createRepo(database);
  const accountIds = new Map<string, string>();

  for (const def of fixtureAccountDefs) {
    const account = await repo.insertAccount({
      name: def.name,
      description: def.description,
    });
    accountIds.set(def.key, account.id);
  }

  for (const def of fixtureBondDefs) {
    const accountId = accountIds.get(def.accountKey);
    expect(accountId).toBeDefined();
    await repo.insertBondHolding({
      accountId: accountId!,
      issuer: def.issuer,
      isin: def.isin,
      cusip: def.cusip,
      faceValue: def.faceValue,
      couponRate: def.couponRate,
      couponFrequency: def.couponFrequency,
      maturityDate: def.maturityDate,
      purchaseDate: def.purchaseDate,
      purchasePrice: def.purchasePrice,
    });
  }

  return repo;
}

describe('system routes', () => {
  let tmpDir: string;
  let dbFile: string;
  let sqlite: Database.Database;
  let database: ReturnType<typeof drizzle>;
  let app: FastifyInstance;

  beforeEach(async () => {
    const conn = await createFileDatabase();
    tmpDir = conn.tmpDir;
    dbFile = conn.dbFile;
    sqlite = conn.sqlite;
    database = conn.database;
    await seedFixtures(database);
    app = await createServer(database, dbFile);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    sqlite.close();
    await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });

  it('GET /api/system/info returns version, path, and null last backup', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/system/info' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.version).toBeTruthy();
    expect(body.databasePath).toBe(dbFile);
    expect(body.lastBackupAt).toBeNull();
  });

  it('GET /api/system/backup streams sqlite file and updates lastBackupAt', async () => {
    const backup = await app.inject({ method: 'GET', url: '/api/system/backup' });
    expect(backup.statusCode).toBe(200);
    expect(backup.headers['content-type']).toContain('application/octet-stream');
    expect(backup.headers['content-disposition']).toContain('attachment');
    expect(backup.rawPayload.subarray(0, 16).equals(SQLITE_MAGIC)).toBe(true);

    const info = await app.inject({ method: 'GET', url: '/api/system/info' });
    expect(info.json().lastBackupAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('POST /api/system/restore round-trips backup after mutation', async () => {
    const backup = await app.inject({ method: 'GET', url: '/api/system/backup' });
    const backupBytes = Buffer.from(backup.rawPayload);

    const holdingsBefore = await app.inject({ method: 'GET', url: '/api/holdings' });
    const countBefore = holdingsBefore.json().length;
    expect(countBefore).toBeGreaterThan(0);

    await app.inject({
      method: 'DELETE',
      url: `/api/holdings/${holdingsBefore.json()[0].id}`,
    });

    const restored = await app.inject({
      method: 'POST',
      url: '/api/system/restore',
      payload: createMultipartPayload(backupBytes),
      headers: createMultipartHeaders(),
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json().restoredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const holdingsAfter = await app.inject({ method: 'GET', url: '/api/holdings' });
    expect(holdingsAfter.json().length).toBe(countBefore);
  });

  it('rejects invalid restore uploads with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/system/restore',
      payload: createMultipartPayload(Buffer.from('not-a-db')),
      headers: createMultipartHeaders(),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
  });

  it('rejects oversize restore uploads with 413', async () => {
    const previous = process.env.RESTORE_MAX_BYTES;
    process.env.RESTORE_MAX_BYTES = '16';
    const smallLimitApp = await createServer(database, dbFile);
    await smallLimitApp.ready();

    try {
      const oversized = await smallLimitApp.inject({
        method: 'POST',
        url: '/api/system/restore',
        payload: createMultipartPayload(Buffer.alloc(32, 0xab)),
        headers: createMultipartHeaders(),
      });
      expect(oversized.statusCode).toBe(413);
    } finally {
      await smallLimitApp.close();
      if (previous === undefined) {
        delete process.env.RESTORE_MAX_BYTES;
      } else {
        process.env.RESTORE_MAX_BYTES = previous;
      }
    }
  });

  it('returns 409 when restore is already in progress', async () => {
    const conn = await createFileDatabase();
    await seedFixtures(conn.database);
    const state = createAppState(conn.database, conn.dbFile);
    const backupBytes = await fs.readFile(conn.dbFile);

    const originalWriteFile = fs.writeFile.bind(fs);
    const delay = vi.spyOn(fs, 'writeFile').mockImplementation(async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return originalWriteFile(...args);
    });

    try {
      const first = restoreDatabaseFromUpload(state, backupBytes);
      await expect(restoreDatabaseFromUpload(state, backupBytes)).rejects.toBeInstanceOf(
        ConflictError
      );
      await first;
    } finally {
      delay.mockRestore();
      await fs.rm(conn.tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  });
});

function createMultipartPayload(fileBuffer: Buffer): Buffer {
  const boundary = '----investment-tracker-test';
  const header = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="backup.db"',
    'Content-Type: application/octet-stream',
    '',
    '',
  ].join('\r\n');
  const footer = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([
    Buffer.from(header, 'utf8'),
    fileBuffer,
    Buffer.from(footer, 'utf8'),
  ]);
}

function createMultipartHeaders() {
  return {
    'content-type': 'multipart/form-data; boundary=----investment-tracker-test',
  };
}
