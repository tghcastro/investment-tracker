import { updateMarketIndicatorSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiMarketIndicator } from './serialize.js';

export function registerPatchMarketIndicator(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/market-indicators/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = updateMarketIndicatorSchema.parse(request.body);
    const indicator = await repo.updateMarketIndicator(id, parsed);
    if (!indicator) {
      throw new NotFoundError('Market indicator not found');
    }
    return reply.status(200).send(toApiMarketIndicator(indicator));
  });
}
