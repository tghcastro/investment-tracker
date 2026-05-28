import { closeDatabase, createConnection, getSqliteClient, type Database } from '../db.js';
import { FieldValidationError } from '../middleware/errors.js';
import { runMigrations } from '../migrations/run.js';

const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');
const REQUIRED_TABLES = ['accounts', 'bond_holdings', 'coupon_payments'] as const;

export function isValidSqliteBuffer(buffer: Buffer): boolean {
  if (buffer.length < 100) {
    return false;
  }
  return buffer.subarray(0, 16).equals(SQLITE_MAGIC);
}

function assertRequiredTables(database: Database): void {
  const client = getSqliteClient(database);
  for (const tableName of REQUIRED_TABLES) {
    const row = client
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
      )
      .get(tableName);
    if (!row) {
      throw new FieldValidationError(
        { file: ['Backup is missing required portfolio tables'] },
        'Invalid backup file'
      );
    }
  }
}

export function validateRestorableDatabaseFile(databasePath: string): void {
  const database = createConnection(databasePath);
  try {
    runMigrations(database);
    assertRequiredTables(database);
  } catch (error) {
    if (error instanceof FieldValidationError) {
      throw error;
    }
    throw new FieldValidationError(
      { file: ['Backup file is invalid or incompatible with this app version'] },
      'Invalid backup file'
    );
  } finally {
    closeDatabase(database);
  }
}

export function assertValidSqliteBuffer(buffer: Buffer): void {
  if (!isValidSqliteBuffer(buffer)) {
    throw new FieldValidationError(
      { file: ['File is not a valid SQLite database'] },
      'Invalid backup file'
    );
  }
}
