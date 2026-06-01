import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { toApiBondHoldings } from '../holdings/serialize.js';

export function registerAccountHoldings(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/accounts/:id/holdings', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const { displayCurrency } = request.query as { displayCurrency?: string };

    if (displayCurrency !== undefined && !/^[A-Z]{3}$/.test(displayCurrency)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'displayCurrency must be a 3-letter ISO code',
        fields: { displayCurrency: ['Must be a 3-letter ISO code'] },
      });
    }

    const holdings = await repo.listBondHoldingsFiltered({ accountId: id }, { displayCurrency });
    return reply.status(200).send(toApiBondHoldings(holdings));
  });
}
