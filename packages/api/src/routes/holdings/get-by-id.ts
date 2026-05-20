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

export function registerGetHoldingById(app: FastifyInstance, repo: Repo): void {
  app.get('/api/holdings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const holding = await repo.getBondHolding(id);
      if (!holding) {
        return reply.status(404).send({
          code: 'NOT_FOUND',
          message: 'Bond holding not found',
        });
      }
      return reply.status(200).send(holding);
    } catch (error) {
      if (error instanceof RepoError) {
        const mapped = mapRepoError(error);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
      throw error;
    }
  });
}
