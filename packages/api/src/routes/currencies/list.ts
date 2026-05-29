import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerListCurrencies(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/currencies', async (_request, reply) => {
    const repo = getRepo();
    const items = await repo.listCurrencies();
    return reply.status(200).send(items);
  });
}

export function registerListAvailableCurrencies(
  app: FastifyInstance,
  getRepo: () => Repo
): void {
  app.get('/api/currencies/available', async (_request, reply) => {
    const repo = getRepo();
    const items = await repo.listAvailableDisplayCurrencies();
    return reply.status(200).send(items);
  });
}
