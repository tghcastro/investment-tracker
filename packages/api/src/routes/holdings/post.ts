import { createBondHoldingSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import {
  couponRatePercentToDecimal,
  toApiBondHolding,
} from './serialize.js';

export function registerPostHolding(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/holdings', async (request, reply) => {
    const repo = getRepo();
    const parsed = createBondHoldingSchema.parse(request.body);
    const { couponRate, ...rest } = parsed;

    const holding = await repo.insertBondHolding({
      ...rest,
      couponRate: couponRatePercentToDecimal(couponRate),
    });
    return reply.status(201).send(toApiBondHolding(holding));
  });
}
