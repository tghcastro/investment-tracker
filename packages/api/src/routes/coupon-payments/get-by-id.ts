import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiCouponPayment } from './serialize.js';

export function registerGetCouponPaymentById(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/coupon-payments/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };

    const payment = await repo.getCouponPayment(id);
    if (!payment) {
      throw new NotFoundError('Coupon payment not found');
    }

    return reply.status(200).send(toApiCouponPayment(payment));
  });
}
