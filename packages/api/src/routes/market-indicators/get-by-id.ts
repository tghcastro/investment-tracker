import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiMarketIndicator } from './serialize.js';

export function registerGetMarketIndicatorById(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/market-indicators/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const indicator = await repo.getMarketIndicator(id);
    if (!indicator) {
      throw new NotFoundError('Market indicator not found');
    }
    return reply.status(200).send(toApiMarketIndicator(indicator));
  });
}
