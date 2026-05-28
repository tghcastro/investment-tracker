import { updateCouponPaymentSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiCouponPayment } from './serialize.js';
import { assertPaymentDateWithinHoldingOrThrow } from './validate.js';

export function registerPatchCouponPayment(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/coupon-payments/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = updateCouponPaymentSchema.parse(request.body);

    const existing = await repo.getCouponPayment(id);
    if (!existing) {
      throw new NotFoundError('Coupon payment not found');
    }

    const holding = await repo.getBondHolding(existing.bondHoldingId);
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }

    const paymentDate = parsed.paymentDate ?? existing.paymentDate;
    assertPaymentDateWithinHoldingOrThrow(paymentDate, holding);

    const updated = await repo.updateCouponPayment(id, parsed);
    if (!updated) {
      throw new NotFoundError('Coupon payment not found');
    }

    return reply.status(200).send(toApiCouponPayment(updated));
  });
}
