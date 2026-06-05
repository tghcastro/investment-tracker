import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../../middleware/errors.js';
import type { Repo } from '../../../repo.js';

export function registerDeleteIndicatorValue(app: FastifyInstance, getRepo: () => Repo): void {
  app.delete('/api/market-indicators/:id/values/:valueId', async (request, reply) => {
    const repo = getRepo();
    const { id, valueId } = request.params as { id: string; valueId: string };

    const indicator = await repo.getMarketIndicator(id);
    if (!indicator) {
      throw new NotFoundError('Market indicator not found');
    }

    const deleted = await repo.deleteIndicatorValue(id, valueId);
    if (!deleted) {
      throw new NotFoundError('Indicator value not found');
    }
    return reply.status(204).send();
  });
}
