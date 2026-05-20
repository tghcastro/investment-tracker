import type { FastifyInstance } from 'fastify';

import { RepoError, type Repo } from '../../repo.js';

function mapRepoError(error: RepoError): { statusCode: number; body: { code: string; message: string } } {
  switch (error.code) {
    case 'FOREIGN_KEY':
    case 'INVALID_ID':
      return { statusCode: 400, body: { code: error.code, message: error.message } };
    default:
      return { statusCode: 500, body: { code: 'INTERNAL_ERROR', message: 'Internal server error' } };
  }
}

export function registerAccountHoldings(app: FastifyInstance, repo: Repo): void {
  app.get('/api/accounts/:id/holdings', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const holdings = await repo.listBondHoldingsByAccount(id);
      return reply.status(200).send(holdings);
    } catch (error) {
      if (error instanceof RepoError) {
        const mapped = mapRepoError(error);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
      throw error;
    }
  });
}
