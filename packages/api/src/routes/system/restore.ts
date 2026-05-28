import type { FastifyInstance } from 'fastify';

import type { AppState } from '../../appState.js';
import { FieldValidationError } from '../../middleware/errors.js';
import { restoreDatabaseFromUpload } from '../../system/restore.js';

export function registerSystemRestore(app: FastifyInstance, state: AppState): void {
  app.post('/api/system/restore', async (request) => {
    const file = await request.file();
    if (!file || file.fieldname !== 'file') {
      throw new FieldValidationError(
        { file: ['Backup file is required'] },
        'Invalid restore upload'
      );
    }

    const fileBuffer = await file.toBuffer();
    return restoreDatabaseFromUpload(state, fileBuffer);
  });
}
