import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiBondHolding } from './serialize.js';

export function registerGetHoldingById(app: FastifyInstance, repo: Repo): void {
  app.get('/api/holdings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const holding = await repo.getBondHolding(id);
    if (!holding) {
      throw new NotFoundError('Bond holding not found');
    }
    return reply.status(200).send(toApiBondHolding(holding));
  });
}
