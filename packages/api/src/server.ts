import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { db } from './db.js';
import { createRepo } from './repo.js';
import { registerAccountHoldings } from './routes/accounts/holdings.js';
import { registerListAccounts } from './routes/accounts/list.js';
import { registerPostAccount } from './routes/accounts/post.js';

export const DEFAULT_PORT = 3000;
const WEB_DEV_ORIGIN = 'http://localhost:3001';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: WEB_DEV_ORIGIN,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  const repo = createRepo(db);
  registerPostAccount(app, repo);
  registerListAccounts(app, repo);
  registerAccountHoldings(app, repo);

  return app;
}

export async function startServer(port: number = DEFAULT_PORT): Promise<FastifyInstance> {
  const app = await createServer();
  await app.listen({ port, host: '0.0.0.0' });
  return app;
}
