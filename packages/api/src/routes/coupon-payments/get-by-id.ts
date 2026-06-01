import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { validateDisplayCurrencyQuery } from './display-currency.js';
import { resolveConvertedCurrency, toApiCouponPayment } from './serialize.js';

export function registerGetCouponPaymentById(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/coupon-payments/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const { displayCurrency } = request.query as { displayCurrency?: string };

    const displayCurrencyResult = validateDisplayCurrencyQuery(displayCurrency);
    if ('status' in displayCurrencyResult) {
      return reply.status(displayCurrencyResult.status).send(displayCurrencyResult.body);
    }

    const payment = await repo.getCouponPayment(id);
    if (!payment) {
      throw new NotFoundError('Coupon payment not found');
    }

    const holding = await repo.getBondHolding(payment.bondHoldingId);
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }

    const quoteHistory = await repo.getQuoteHistory();
    const convertedCurrency = resolveConvertedCurrency(displayCurrencyResult.displayCurrency);

    return reply.status(200).send(
      toApiCouponPayment(payment, {
        currencyCode: holding.currencyCode,
        convertedCurrency,
        quoteHistory,
      })
    );
  });
}
