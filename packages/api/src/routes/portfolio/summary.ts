import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerPortfolioSummary(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/portfolio/summary', async (_request, reply) => {
    const repo = getRepo();
    const summary = await repo.getPortfolioSummary();
    return reply.status(200).send(summary);
  });
}
