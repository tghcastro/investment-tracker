import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerListAccounts(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/accounts', async (request, reply) => {
    const repo = getRepo();
    const { includeArchived } = request.query as { includeArchived?: string };
    const accounts = await repo.listAccounts({
      includeArchived: includeArchived === 'true',
    });
    return reply.status(200).send(accounts);
  });
}
