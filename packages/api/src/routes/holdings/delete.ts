import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerDeleteHolding(app: FastifyInstance, getRepo: () => Repo): void {
  app.delete('/api/holdings/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };

    const deleted = await repo.deleteBondHolding(id);
    if (!deleted) {
      throw new NotFoundError('Bond holding not found');
    }
    return reply.status(204).send();
  });
}
