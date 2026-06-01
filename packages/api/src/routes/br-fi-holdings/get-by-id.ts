import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiBrFiHolding } from './serialize.js';

export function registerGetBrFiHoldingById(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/br-fi-holdings/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };

    const holding = await repo.getBrFiHolding(id);
    if (!holding) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }
    return reply.status(200).send(toApiBrFiHolding(holding));
  });
}
