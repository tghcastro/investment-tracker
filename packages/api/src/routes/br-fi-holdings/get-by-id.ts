import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import { validateDisplayCurrencyQuery } from '../coupon-payments/display-currency.js';
import type { Repo } from '../../repo.js';
import { toApiBrFiHolding } from './serialize.js';

export function registerGetBrFiHoldingById(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/br-fi-holdings/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const { displayCurrency } = request.query as { displayCurrency?: string };

    const displayCurrencyResult = validateDisplayCurrencyQuery(displayCurrency);
    if ('status' in displayCurrencyResult) {
      return reply.status(displayCurrencyResult.status).send(displayCurrencyResult.body);
    }

    const holding = await repo.getBrFiHoldingWithConverted(id, {
      displayCurrency: displayCurrencyResult.displayCurrency,
    });
    if (!holding) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }
    return reply.status(200).send(toApiBrFiHolding(holding));
  });
}
