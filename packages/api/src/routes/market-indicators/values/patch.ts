import { updateIndicatorValueSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../../middleware/errors.js';
import type { Repo } from '../../../repo.js';
import { toApiIndicatorValue } from '../serialize.js';

export function registerPatchIndicatorValue(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/market-indicators/:id/values/:valueId', async (request, reply) => {
    const repo = getRepo();
    const { id, valueId } = request.params as { id: string; valueId: string };
    const parsed = updateIndicatorValueSchema.parse(request.body);

    const indicator = await repo.getMarketIndicator(id);
    if (!indicator) {
      throw new NotFoundError('Market indicator not found');
    }

    const value = await repo.updateIndicatorValue(id, valueId, parsed);
    if (!value) {
      throw new NotFoundError('Indicator value not found');
    }
    return reply.status(200).send(toApiIndicatorValue(value));
  });
}
