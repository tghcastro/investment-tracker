import { updateBondHoldingSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import {
  couponRatePercentToDecimal,
  toApiBondHolding,
} from './serialize.js';

export function registerPatchHolding(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/holdings/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = updateBondHoldingSchema.parse(request.body);
    const { couponRate, ...rest } = parsed;

    const updateData = {
      ...rest,
      ...(couponRate !== undefined
        ? { couponRate: couponRatePercentToDecimal(couponRate) }
        : {}),
    };

    const holding = await repo.updateBondHolding(id, updateData);
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }
    return reply.status(200).send(toApiBondHolding(holding));
  });
}
