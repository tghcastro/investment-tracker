import fs from 'node:fs/promises';
import path from 'node:path';

import type { AppState } from '../appState.js';
import { closeDatabase, getDatabaseDirectory } from '../db.js';
import { ConflictError } from '../middleware/errors.js';
import { runMigrations } from '../migrations/run.js';
import { assertValidSqliteBuffer, validateRestorableDatabaseFile } from './validateSqlite.js';

let restoreInProgress = false;

export type RestoreResult = {
  restoredAt: string;
};

export async function restoreDatabaseFromUpload(
  state: AppState,
  fileBuffer: Buffer
): Promise<RestoreResult> {
  const databaseFilePath = state.getDatabasePath();
  if (restoreInProgress) {
    throw new ConflictError('Restore already in progress');
  }

  restoreInProgress = true;
  const dbDir = getDatabaseDirectory(databaseFilePath);
  const incomingPath = path.join(dbDir, '.restore-incoming.db');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preRestorePath = path.join(dbDir, `.pre-restore-${timestamp}.db`);

  try {
    assertValidSqliteBuffer(fileBuffer);
    await fs.mkdir(dbDir, { recursive: true });

    try {
      await fs.access(databaseFilePath);
      await fs.copyFile(databaseFilePath, preRestorePath);
    } catch {
      // no existing database to preserve
    }

    await fs.writeFile(incomingPath, fileBuffer);
    validateRestorableDatabaseFile(incomingPath);

    closeDatabase(state.getDb());
    await fs.rename(incomingPath, databaseFilePath);
    state.reconnect(databaseFilePath);
    runMigrations(state.getDb());

    return { restoredAt: new Date().toISOString() };
  } catch (error) {
    try {
      await fs.access(preRestorePath);
      await fs.copyFile(preRestorePath, databaseFilePath);
      state.reconnect(databaseFilePath);
      runMigrations(state.getDb());
    } catch {
      // best-effort rollback only
    }
    throw error;
  } finally {
    restoreInProgress = false;
    await fs.unlink(incomingPath).catch(() => undefined);
  }
}

export function isRestoreInProgress(): boolean {
  return restoreInProgress;
}
