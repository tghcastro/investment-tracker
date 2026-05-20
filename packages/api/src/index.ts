export { accounts, bondHoldings, couponPayments } from './schema.js';
export { db, createConnection } from './db.js';
export {
  createRepo,
  RepoError,
  type Repo,
  type InsertAccountData,
  type InsertBondHoldingData,
  type InsertCouponPaymentData,
} from './repo.js';
export { createServer, startServer, DEFAULT_PORT } from './server.js';
import { pathToFileURL } from 'node:url';
import { db } from './db.js';
import { createRepo } from './repo.js';
import { startServer } from './server.js';

export const repo = createRepo(db);

const isMain =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  await startServer();
}
