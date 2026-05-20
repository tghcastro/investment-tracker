import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { db, type Database } from './db.js';
import { registerErrorHandler } from './middleware/errors.js';
import { createRepo } from './repo.js';
import { registerAccountHoldings } from './routes/accounts/holdings.js';
import { registerListAccounts } from './routes/accounts/list.js';
import { registerPostAccount } from './routes/accounts/post.js';
import { registerGetHoldingById } from './routes/holdings/get-by-id.js';
import { registerListHoldings } from './routes/holdings/list.js';
import { registerPostHolding } from './routes/holdings/post.js';

export const DEFAULT_PORT = 3000;
const WEB_DEV_ORIGIN = 'http://localhost:3001';

export async function createServer(database: Database = db): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: WEB_DEV_ORIGIN,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  registerErrorHandler(app);

  const repo = createRepo(database);
  registerPostAccount(app, repo);
  registerListAccounts(app, repo);
  registerAccountHoldings(app, repo);
  registerPostHolding(app, repo);
  registerListHoldings(app, repo);
  registerGetHoldingById(app, repo);

  return app;
}

export async function startServer(port: number = DEFAULT_PORT): Promise<FastifyInstance> {
  const app = await createServer();
  await app.listen({ port, host: '0.0.0.0' });
  return app;
}
