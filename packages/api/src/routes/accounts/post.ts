import { createAccountSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerPostAccount(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/accounts', async (request, reply) => {
    const repo = getRepo();
    const parsed = createAccountSchema.parse(request.body);
    const { currencyCodes, ...rest } = parsed;
    const account = await repo.insertAccount({
      ...rest,
      currencyCodes,
    });
    return reply.status(201).send(account);
  });
}
