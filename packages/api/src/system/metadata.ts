import fs from 'node:fs/promises';
import path from 'node:path';

const METADATA_FILENAME = '.last-backup.json';

export async function readLastBackupAt(dbDir: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(dbDir, METADATA_FILENAME), 'utf8');
    const parsed = JSON.parse(raw) as { lastBackupAt?: unknown };
    return typeof parsed.lastBackupAt === 'string' ? parsed.lastBackupAt : null;
  } catch {
    return null;
  }
}

export async function writeLastBackupAt(dbDir: string, iso: string): Promise<void> {
  await fs.mkdir(dbDir, { recursive: true });
  const target = path.join(dbDir, METADATA_FILENAME);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify({ lastBackupAt: iso }), 'utf8');
  await fs.rename(temp, target);
}
