import { createCouponPaymentSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiCouponPayment } from './serialize.js';
import { assertPaymentDateWithinHoldingOrThrow } from './validate.js';

export function registerPostCouponPayment(app: FastifyInstance, repo: Repo): void {
  app.post('/api/coupon-payments', async (request, reply) => {
    const parsed = createCouponPaymentSchema.parse(request.body);

    const holding = await repo.getBondHolding(parsed.bondHoldingId);
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }

    assertPaymentDateWithinHoldingOrThrow(parsed.paymentDate, holding);

    const payment = await repo.insertCouponPayment({
      bondHoldingId: parsed.bondHoldingId,
      paymentDate: parsed.paymentDate,
      amount: parsed.amount,
    });

    return reply.status(201).send(toApiCouponPayment(payment));
  });
}
