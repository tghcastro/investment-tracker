import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerGetLatestMarketIndicatorValue(
  app: FastifyInstance,
  getRepo: () => Repo
): void {
  app.get('/api/market-indicators/:id/latest', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const indicator = await repo.getMarketIndicator(id);
    if (!indicator) {
      throw new NotFoundError('Market indicator not found');
    }
    const latest = await repo.getLatestIndicatorValue(id);
    return reply.status(200).send(latest);
  });
}
