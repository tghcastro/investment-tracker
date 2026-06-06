import { updateBrFiInterestPaymentSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { resolveConvertedCurrency, toApiBrFiInterestPayment } from './serialize.js';
import { assertBrFiPaymentDateWithinHoldingOrThrow } from './validate.js';

export function registerPatchBrFiInterestPayment(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/br-fi-interest-payments/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = updateBrFiInterestPaymentSchema.parse(request.body);

    const existing = await repo.getBrFiInterestPayment(id);
    if (!existing) {
      throw new NotFoundError('Interest payment not found');
    }

    const holding = await repo.getBrFiHolding(existing.brFiHoldingId);
    if (!holding) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }

    const paymentDate = parsed.paymentDate ?? existing.paymentDate;
    assertBrFiPaymentDateWithinHoldingOrThrow(paymentDate, holding);

    const updated = await repo.updateBrFiInterestPayment(id, parsed);
    if (!updated) {
      throw new NotFoundError('Interest payment not found');
    }

    const quoteHistory = await repo.getQuoteHistory();

    return reply.status(200).send(
      toApiBrFiInterestPayment(updated, {
        currencyCode: holding.currencyCode,
        convertedCurrency: resolveConvertedCurrency(),
        quoteHistory,
      })
    );
  });
}
