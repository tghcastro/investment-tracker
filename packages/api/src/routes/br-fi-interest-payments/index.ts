import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { registerDeleteBrFiInterestPayment } from './delete.js';
import { registerGetBrFiInterestPaymentById } from './get-by-id.js';
import { registerListBrFiInterestPayments } from './list.js';
import { registerPatchBrFiInterestPayment } from './patch.js';
import { registerPostBrFiInterestPayment } from './post.js';

export function registerBrFiInterestPaymentsRoutes(
  app: FastifyInstance,
  getRepo: () => Repo
): void {
  registerPostBrFiInterestPayment(app, getRepo);
  registerListBrFiInterestPayments(app, getRepo);
  registerGetBrFiInterestPaymentById(app, getRepo);
  registerPatchBrFiInterestPayment(app, getRepo);
  registerDeleteBrFiInterestPayment(app, getRepo);
}
