import path from 'path';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, dbPath } from './db.js';
import { fixtureAccountList, seed } from './fixtures/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const migrationsFolder = path.join(packageDir, 'src/migrations');

migrate(db, { migrationsFolder });
seed();

console.log(`Migrations applied to ${dbPath}`);
console.log(`Seeded fixture data (${fixtureAccountList.length} accounts)`);
