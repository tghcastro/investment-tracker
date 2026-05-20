import { createBondHoldingSchema } from 'bonds-domain';
import type { BondHolding } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

/** Request/response couponRate is annual % (schema 0–100); repo stores decimal (e.g. 4.25 → 0.0425). */
function couponRatePercentToDecimal(percent: number): number {
  return percent / 100;
}

function couponRateDecimalToPercent(decimal: number): number {
  return decimal * 100;
}

function toApiBondHolding(holding: BondHolding): BondHolding {
  return {
    ...holding,
    couponRate: couponRateDecimalToPercent(holding.couponRate),
  };
}

export function registerPostHolding(app: FastifyInstance, repo: Repo): void {
  app.post('/api/holdings', async (request, reply) => {
    const parsed = createBondHoldingSchema.parse(request.body);
    const { couponRate, ...rest } = parsed;

    const holding = await repo.insertBondHolding({
      ...rest,
      couponRate: couponRatePercentToDecimal(couponRate),
    });
    return reply.status(201).send(toApiBondHolding(holding));
  });
}
