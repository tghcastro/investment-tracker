import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerPortfolioSummary(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/portfolio/summary', async (request, reply) => {
    const repo = getRepo();
    const { displayCurrency } = request.query as {
      displayCurrency?: string;
    };

    if (displayCurrency !== undefined && !/^[A-Z]{3}$/.test(displayCurrency)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'displayCurrency must be a 3-letter ISO code',
        fields: { displayCurrency: ['Must be a 3-letter ISO code'] },
      });
    }

    const summary = await repo.getPortfolioSummary({ displayCurrency });
    return reply.status(200).send(summary);
  });
}
