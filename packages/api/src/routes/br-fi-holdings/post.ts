import { brFiHoldingCreateSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { toApiBrFiHolding } from './serialize.js';

export function registerPostBrFiHolding(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/br-fi-holdings', async (request, reply) => {
    const repo = getRepo();
    const parsed = brFiHoldingCreateSchema.parse(request.body);
    const { currencyCode, ...rest } = parsed;

    const holding = await repo.insertBrFiHolding({
      ...rest,
      currencyCode,
      marketIndicatorId: parsed.marketIndicatorId,
    });
    return reply.status(201).send(toApiBrFiHolding(holding));
  });
}
