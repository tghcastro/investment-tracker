import { createBrFiInterestPaymentSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { resolveConvertedCurrency, toApiBrFiInterestPayment } from './serialize.js';
import { assertBrFiPaymentDateWithinHoldingOrThrow } from './validate.js';

export function registerPostBrFiInterestPayment(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/br-fi-interest-payments', async (request, reply) => {
    const repo = getRepo();
    const parsed = createBrFiInterestPaymentSchema.parse(request.body);

    const holding = await repo.getBrFiHolding(parsed.brFiHoldingId);
    if (!holding) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }

    assertBrFiPaymentDateWithinHoldingOrThrow(parsed.paymentDate, holding);

    const payment = await repo.insertBrFiInterestPayment({
      brFiHoldingId: parsed.brFiHoldingId,
      paymentDate: parsed.paymentDate,
      amount: parsed.amount,
    });

    const quoteHistory = await repo.getQuoteHistory();

    return reply.status(201).send(
      toApiBrFiInterestPayment(payment, {
        currencyCode: holding.currencyCode,
        convertedCurrency: resolveConvertedCurrency(),
        quoteHistory,
      })
    );
  });
}
