import type { FastifyInstance } from 'fastify';

import type { AppState } from '../../appState.js';
import { createBackupStream } from '../../system/backup.js';

export function registerSystemBackup(app: FastifyInstance, state: AppState): void {
  app.get('/api/system/backup', async (_request, reply) => {
    const backup = await createBackupStream(state);

    reply.header('Content-Type', 'application/octet-stream');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${backup.filename}"`
    );

    await backup.recordBackupMetadata();
    await reply.send(backup.stream);
    await backup.cleanup();
  });
}
