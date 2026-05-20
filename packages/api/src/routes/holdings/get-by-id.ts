import type { BondHolding } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

function couponRateDecimalToPercent(decimal: number): number {
  return decimal * 100;
}

function toApiBondHolding(holding: BondHolding): BondHolding {
  return {
    ...holding,
    couponRate: couponRateDecimalToPercent(holding.couponRate),
  };
}

export function registerGetHoldingById(app: FastifyInstance, repo: Repo): void {
  app.get('/api/holdings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const holding = await repo.getBondHolding(id);
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }
    return reply.status(200).send(toApiBondHolding(holding));
  });
}
