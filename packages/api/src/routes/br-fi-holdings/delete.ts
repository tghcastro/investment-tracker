import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerDeleteBrFiHolding(app: FastifyInstance, getRepo: () => Repo): void {
  app.delete('/api/br-fi-holdings/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };

    const deleted = await repo.deleteBrFiHolding(id);
    if (!deleted) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }
    return reply.status(204).send();
  });
}
