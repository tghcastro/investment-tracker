import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { validateDisplayCurrencyQuery } from './display-currency.js';
import { resolveConvertedCurrency, toApiBrFiInterestPayment } from './serialize.js';

function parseBrFiHoldingId(value: string | undefined):
  | { brFiHoldingId: string }
  | { message: string } {
  if (value === undefined || value === '') {
    return { message: 'brFiHoldingId is required' };
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    return { message: 'brFiHoldingId must be a positive integer' };
  }

  return { brFiHoldingId: value };
}

export function registerListBrFiInterestPayments(
  app: FastifyInstance,
  getRepo: () => Repo
): void {
  app.get('/api/br-fi-interest-payments', async (request, reply) => {
    const repo = getRepo();
    const { brFiHoldingId, displayCurrency } = request.query as {
      brFiHoldingId?: string;
      displayCurrency?: string;
    };

    const displayCurrencyResult = validateDisplayCurrencyQuery(displayCurrency);
    if ('status' in displayCurrencyResult) {
      return reply.status(displayCurrencyResult.status).send(displayCurrencyResult.body);
    }

    const parsed = parseBrFiHoldingId(brFiHoldingId);
    if ('message' in parsed) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.message,
        fields: { brFiHoldingId: [parsed.message] },
      });
    }

    const holding = await repo.getBrFiHolding(parsed.brFiHoldingId);
    if (!holding) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }

    const payments = await repo.listBrFiInterestPaymentsByHolding(parsed.brFiHoldingId);
    const quoteHistory = await repo.getQuoteHistory();
    const convertedCurrency = resolveConvertedCurrency(displayCurrencyResult.displayCurrency);

    return reply.status(200).send(
      payments.map((payment) =>
        toApiBrFiInterestPayment(payment, {
          currencyCode: holding.currencyCode,
          convertedCurrency,
          quoteHistory,
        })
      )
    );
  });
}
