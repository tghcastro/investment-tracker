import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { registerDeleteBrFiHolding } from './delete.js';
import { registerGetBrFiHoldingById } from './get-by-id.js';
import { registerListBrFiHoldings } from './list.js';
import { registerPatchBrFiHolding } from './patch.js';
import { registerPostBrFiHolding } from './post.js';

export function registerBrFiHoldingsRoutes(app: FastifyInstance, getRepo: () => Repo): void {
  registerListBrFiHoldings(app, getRepo);
  registerGetBrFiHoldingById(app, getRepo);
  registerPostBrFiHolding(app, getRepo);
  registerPatchBrFiHolding(app, getRepo);
  registerDeleteBrFiHolding(app, getRepo);
}
