import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerListAccounts(app: FastifyInstance, repo: Repo): void {
  app.get('/api/accounts', async (_request, reply) => {
    const accounts = await repo.listAccounts();
    return reply.status(200).send(accounts);
  });
}
