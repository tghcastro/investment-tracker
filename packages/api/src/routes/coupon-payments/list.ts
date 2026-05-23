import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiCouponPayment } from './serialize.js';

function parseBondHoldingId(value: string | undefined):
  | { bondHoldingId: string }
  | { message: string } {
  if (value === undefined || value === '') {
    return { message: 'bondHoldingId is required' };
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    return { message: 'bondHoldingId must be a positive integer' };
  }

  return { bondHoldingId: value };
}

export function registerListCouponPayments(app: FastifyInstance, repo: Repo): void {
  app.get('/api/coupon-payments', async (request, reply) => {
    const { bondHoldingId } = request.query as { bondHoldingId?: string };
    const parsed = parseBondHoldingId(bondHoldingId);
    if ('message' in parsed) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.message,
        fields: { bondHoldingId: [parsed.message] },
      });
    }

    const holding = await repo.getBondHolding(parsed.bondHoldingId);
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }

    const payments = await repo.listCouponPaymentsByHolding(parsed.bondHoldingId);
    return reply.status(200).send(payments.map(toApiCouponPayment));
  });
}
