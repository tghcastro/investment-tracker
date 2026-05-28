import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { createAppState } from './appState.js';
import { db, type Database } from './db.js';
import { registerErrorHandler } from './middleware/errors.js';
import { registerArchiveAccount } from './routes/accounts/archive.js';
import { registerGetAccountById } from './routes/accounts/get-by-id.js';
import { registerAccountHoldings } from './routes/accounts/holdings.js';
import { registerListAccounts } from './routes/accounts/list.js';
import { registerPatchAccount } from './routes/accounts/patch.js';
import { registerPostAccount } from './routes/accounts/post.js';
import { registerDeleteHolding } from './routes/holdings/delete.js';
import { registerGetHoldingById } from './routes/holdings/get-by-id.js';
import { registerListHoldings } from './routes/holdings/list.js';
import { registerPatchHolding } from './routes/holdings/patch.js';
import { registerPostHolding } from './routes/holdings/post.js';
import { registerDeleteCouponPayment } from './routes/coupon-payments/delete.js';
import { registerGetCouponPaymentById } from './routes/coupon-payments/get-by-id.js';
import { registerListCouponPayments } from './routes/coupon-payments/list.js';
import { registerPatchCouponPayment } from './routes/coupon-payments/patch.js';
import { registerPostCouponPayment } from './routes/coupon-payments/post.js';
import { registerPortfolioIncomeSummary } from './routes/portfolio/income-summary.js';
import { registerPortfolioSummary } from './routes/portfolio/summary.js';
import { registerPortfolioUpcomingCoupons } from './routes/portfolio/upcoming-coupons.js';

export const DEFAULT_PORT = 3000;

/** Dev web origins. Override with CORS_ORIGINS (comma-separated). */
const DEFAULT_CORS_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
];

export function getCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_CORS_ORIGINS;
}

export async function createServer(initialDb: Database = db): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  const allowedOrigins = getCorsOrigins();

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.get('/health', async () => ({ status: 'ok' }));

  registerErrorHandler(app);

  const state = createAppState(initialDb);
  const getRepo = () => state.getRepo();
  registerPostAccount(app, getRepo);
  registerListAccounts(app, getRepo);
  registerGetAccountById(app, getRepo);
  registerPatchAccount(app, getRepo);
  registerArchiveAccount(app, getRepo);
  registerAccountHoldings(app, getRepo);
  registerPostHolding(app, getRepo);
  registerListHoldings(app, getRepo);
  registerGetHoldingById(app, getRepo);
  registerPatchHolding(app, getRepo);
  registerDeleteHolding(app, getRepo);
  registerPortfolioSummary(app, getRepo);
  registerPortfolioIncomeSummary(app, getRepo);
  registerPortfolioUpcomingCoupons(app, getRepo);
  registerPostCouponPayment(app, getRepo);
  registerListCouponPayments(app, getRepo);
  registerGetCouponPaymentById(app, getRepo);
  registerPatchCouponPayment(app, getRepo);
  registerDeleteCouponPayment(app, getRepo);

  return app;
}

export async function startServer(port: number = DEFAULT_PORT): Promise<FastifyInstance> {
  const app = await createServer();
  await app.listen({ port, host: '0.0.0.0' });
  return app;
}
