import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../../middleware/errors.js';
import type { Repo } from '../../../repo.js';
import { toApiIndicatorValues } from '../serialize.js';

export function registerListIndicatorValues(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/market-indicators/:id/values', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const { fromDate, toDate } = request.query as { fromDate?: string; toDate?: string };

    const indicator = await repo.getMarketIndicator(id);
    if (!indicator) {
      throw new NotFoundError('Market indicator not found');
    }

    const values = await repo.listIndicatorValues(id, { fromDate, toDate });
    return reply.status(200).send(toApiIndicatorValues(values));
  });
}
