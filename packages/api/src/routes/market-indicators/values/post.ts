import { createIndicatorValueSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../../middleware/errors.js';
import type { Repo } from '../../../repo.js';
import { toApiIndicatorValue } from '../serialize.js';

export function registerPostIndicatorValue(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/market-indicators/:id/values', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = createIndicatorValueSchema.parse(request.body);

    const indicator = await repo.getMarketIndicator(id);
    if (!indicator) {
      throw new NotFoundError('Market indicator not found');
    }

    const value = await repo.insertIndicatorValue(id, parsed);
    return reply.status(201).send(toApiIndicatorValue(value));
  });
}
