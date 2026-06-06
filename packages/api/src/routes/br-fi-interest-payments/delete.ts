import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerDeleteBrFiInterestPayment(
  app: FastifyInstance,
  getRepo: () => Repo
): void {
  app.delete('/api/br-fi-interest-payments/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };

    const deleted = await repo.deleteBrFiInterestPayment(id);
    if (!deleted) {
      throw new NotFoundError('Interest payment not found');
    }

    return reply.status(204).send();
  });
}
