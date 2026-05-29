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
    const { couponRate, holdingTypeId, currencyCode, ...rest } = parsed;

    if (holdingTypeId !== undefined) {
      const holdingType = await repo.getHoldingTypeById(holdingTypeId);
      if (!holdingType) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Invalid holding type for bond holdings',
          fields: { holdingTypeId: ['Holding type not found'] },
        });
      }
      if (holdingType.slug !== 'bond') {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Only bond holdings can be created via this endpoint',
          fields: { holdingTypeId: ['Must be the Bond holding type'] },
        });
      }
    }

    const holding = await repo.insertBondHolding({
      ...rest,
      holdingTypeId,
      currencyCode,
      couponRate: couponRatePercentToDecimal(couponRate),
    });
    return reply.status(201).send(toApiBondHolding(holding));
  });
}
