import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerDeleteCouponPayment(app: FastifyInstance, repo: Repo): void {
  app.delete('/api/coupon-payments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const deleted = await repo.deleteCouponPayment(id);
    if (!deleted) {
      throw new NotFoundError('Coupon payment not found');
    }

    return reply.status(204).send();
  });
}
