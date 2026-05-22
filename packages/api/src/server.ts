import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { db, type Database } from './db.js';
import { registerErrorHandler } from './middleware/errors.js';
import { createRepo } from './repo.js';
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
import { registerPortfolioSummary } from './routes/portfolio/summary.js';

export const DEFAULT_PORT = 3000;

/** Dev web origins: port 80 (README) and legacy :3001. Override with CORS_ORIGINS (comma-separated). */
const DEFAULT_CORS_ORIGINS = ['http://localhost', 'http://localhost:3001'];

export function getCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_CORS_ORIGINS;
}

export async function createServer(database: Database = db): Promise<FastifyInstance> {
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
  });

  app.get('/health', async () => ({ status: 'ok' }));

  registerErrorHandler(app);

  const repo = createRepo(database);
  registerPostAccount(app, repo);
  registerListAccounts(app, repo);
  registerGetAccountById(app, repo);
  registerPatchAccount(app, repo);
  registerArchiveAccount(app, repo);
  registerAccountHoldings(app, repo);
  registerPostHolding(app, repo);
  registerListHoldings(app, repo);
  registerGetHoldingById(app, repo);
  registerPatchHolding(app, repo);
  registerDeleteHolding(app, repo);
  registerPortfolioSummary(app, repo);

  return app;
}

export async function startServer(port: number = DEFAULT_PORT): Promise<FastifyInstance> {
  const app = await createServer();
  await app.listen({ port, host: '0.0.0.0' });
  return app;
}
