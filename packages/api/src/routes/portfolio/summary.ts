import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerPortfolioSummary(app: FastifyInstance, repo: Repo): void {
  app.get('/api/portfolio/summary', async (_request, reply) => {
    const summary = await repo.getPortfolioSummary();
    return reply.status(200).send(summary);
  });
}
