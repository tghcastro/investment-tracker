import path from 'node:path';
import type { FastifyInstance } from 'fastify';

import type { AppState } from '../../appState.js';
import { readLastBackupAt } from '../../system/metadata.js';
import { getAppVersion } from '../../system/version.js';
import { getDatabaseDirectory } from '../../db.js';

export function registerSystemInfo(app: FastifyInstance, state: AppState): void {
  app.get('/api/system/info', async () => {
    const databasePath = state.getDatabasePath();
    return {
      version: getAppVersion(),
      databasePath: path.resolve(databasePath),
      lastBackupAt: await readLastBackupAt(getDatabaseDirectory(databasePath)),
    };
  });
}
