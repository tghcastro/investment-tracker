import { createMarketIndicatorSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { toApiMarketIndicator } from './serialize.js';

export function registerPostMarketIndicator(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/market-indicators', async (request, reply) => {
    const repo = getRepo();
    const parsed = createMarketIndicatorSchema.parse(request.body);
    const indicator = await repo.insertMarketIndicator(parsed);
    return reply.status(201).send(toApiMarketIndicator(indicator));
  });
}
