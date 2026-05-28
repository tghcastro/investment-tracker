import { updateAccountSchema } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerPatchAccount(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/accounts/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = updateAccountSchema.parse(request.body);

    const existing = await repo.getAccount(id);
    if (!existing) {
      throw new NotFoundError('Account not found');
    }

    if (existing.archivedAt && parsed.name !== undefined) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Cannot rename archived account',
        fields: {
          name: ['Cannot rename archived account'],
        },
      });
    }

    const account = await repo.updateAccount(id, parsed);
    return reply.status(200).send(account);
  });
}
