import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { AppState } from '../appState.js';
import { checkpointWal, getDatabaseDirectory, getSqliteClient } from '../db.js';
import { writeLastBackupAt } from './metadata.js';

export function buildBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `investment-tracker-backup-${timestamp}.db`;
}

export type BackupStreamResult = {
  filename: string;
  stream: ReturnType<typeof createReadStream>;
  cleanup: () => Promise<void>;
  recordBackupMetadata: () => Promise<void>;
};

export async function createBackupStream(state: AppState): Promise<BackupStreamResult> {
  const databaseFilePath = state.getDatabasePath();
  checkpointWal(state.getDb());

  const tempPath = path.join(
    os.tmpdir(),
    `investment-tracker-backup-${process.pid}-${Date.now()}.db`
  );
  await getSqliteClient(state.getDb()).backup(tempPath);

  const filename = buildBackupFilename();

  return {
    filename,
    stream: createReadStream(tempPath),
    cleanup: async () => {
      await fs.unlink(tempPath).catch(() => undefined);
    },
    recordBackupMetadata: async () => {
      await writeLastBackupAt(
        getDatabaseDirectory(databaseFilePath),
        new Date().toISOString()
      );
    },
  };
}
