import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerDeleteMarketIndicator(app: FastifyInstance, getRepo: () => Repo): void {
  app.delete('/api/market-indicators/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const deleted = await repo.deleteMarketIndicator(id);
    if (!deleted) {
      throw new NotFoundError('Market indicator not found');
    }
    return reply.status(204).send();
  });
}
