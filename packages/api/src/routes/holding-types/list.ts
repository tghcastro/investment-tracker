import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

export function registerListHoldingTypes(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/holding-types', async (_request, reply) => {
    const repo = getRepo();
    const types = await repo.listHoldingTypes();
    return reply.status(200).send(
      types.map((type) => ({
        id: type.id,
        slug: type.slug,
        name: type.name,
        sortOrder: type.sortOrder,
      }))
    );
  });
}
