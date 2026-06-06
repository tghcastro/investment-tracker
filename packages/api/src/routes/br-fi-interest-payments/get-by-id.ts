import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { validateDisplayCurrencyQuery } from './display-currency.js';
import { resolveConvertedCurrency, toApiBrFiInterestPayment } from './serialize.js';

export function registerGetBrFiInterestPaymentById(
  app: FastifyInstance,
  getRepo: () => Repo
): void {
  app.get('/api/br-fi-interest-payments/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const { displayCurrency } = request.query as { displayCurrency?: string };

    const displayCurrencyResult = validateDisplayCurrencyQuery(displayCurrency);
    if ('status' in displayCurrencyResult) {
      return reply.status(displayCurrencyResult.status).send(displayCurrencyResult.body);
    }

    const payment = await repo.getBrFiInterestPayment(id);
    if (!payment) {
      throw new NotFoundError('Interest payment not found');
    }

    const holding = await repo.getBrFiHolding(payment.brFiHoldingId);
    if (!holding) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }

    const quoteHistory = await repo.getQuoteHistory();
    const convertedCurrency = resolveConvertedCurrency(displayCurrencyResult.displayCurrency);

    return reply.status(200).send(
      toApiBrFiInterestPayment(payment, {
        currencyCode: holding.currencyCode,
        convertedCurrency,
        quoteHistory,
      })
    );
  });
}
