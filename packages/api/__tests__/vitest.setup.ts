import os from 'node:os';
import path from 'node:path';

// Isolated DB file per Vitest worker — prevents SQLITE_BUSY on shared data.db in CI.
const workerId = process.env.VITEST_WORKER_ID ?? process.env.VITEST_POOL_ID ?? String(process.pid);
process.env.DATABASE_URL = path.join(os.tmpdir(), `invtr-api-test-${workerId}.db`);
