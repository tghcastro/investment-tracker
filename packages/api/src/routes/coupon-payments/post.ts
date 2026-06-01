import { createCouponPaymentSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { resolveConvertedCurrency, toApiCouponPayment } from './serialize.js';
import { assertPaymentDateWithinHoldingOrThrow } from './validate.js';

export function registerPostCouponPayment(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/coupon-payments', async (request, reply) => {
    const repo = getRepo();
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

    const quoteHistory = await repo.getQuoteHistory();

    return reply.status(201).send(
      toApiCouponPayment(payment, {
        currencyCode: holding.currencyCode,
        convertedCurrency: resolveConvertedCurrency(),
        quoteHistory,
      })
    );
  });
}
