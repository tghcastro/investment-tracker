import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerAccountHoldings(app: FastifyInstance, repo: Repo): void {
  app.get('/api/accounts/:id/holdings', async (request, reply) => {
    const { id } = request.params as { id: string };

    const holdings = await repo.listBondHoldingsByAccount(id);
    return reply.status(200).send(holdings);
  });
}
