import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { validateDisplayCurrencyQuery } from './display-currency.js';
import { resolveConvertedCurrency, toApiCouponPayment } from './serialize.js';

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

export function registerListCouponPayments(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/coupon-payments', async (request, reply) => {
    const repo = getRepo();
    const { bondHoldingId, displayCurrency } = request.query as {
      bondHoldingId?: string;
      displayCurrency?: string;
    };

    const displayCurrencyResult = validateDisplayCurrencyQuery(displayCurrency);
    if ('status' in displayCurrencyResult) {
      return reply.status(displayCurrencyResult.status).send(displayCurrencyResult.body);
    }

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
    const quoteHistory = await repo.getQuoteHistory();
    const convertedCurrency = resolveConvertedCurrency(displayCurrencyResult.displayCurrency);

    return reply.status(200).send(
      payments.map((payment) =>
        toApiCouponPayment(payment, {
          currencyCode: holding.currencyCode,
          convertedCurrency,
          quoteHistory,
        })
      )
    );
  });
}
