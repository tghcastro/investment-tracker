import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiBondHolding } from './serialize.js';

export function registerGetHoldingById(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/holdings/:id', async (request, reply) => {
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

    const holding = await repo.getBondHoldingWithConverted(id, { displayCurrency });
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }
    return reply.status(200).send(toApiBondHolding(holding));
  });
}
