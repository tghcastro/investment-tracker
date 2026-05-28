import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerArchiveAccount(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/accounts/:id/archive', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };

    const account = await repo.archiveAccount(id);
    if (!account) {
      throw new NotFoundError('Account not found');
    }
    return reply.status(200).send(account);
  });
}
