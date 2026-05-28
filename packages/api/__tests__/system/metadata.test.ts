import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { readLastBackupAt, writeLastBackupAt } from '../../src/system/metadata.js';

describe('backup metadata', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns null when metadata file is missing', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meta-'));
    expect(await readLastBackupAt(tmpDir)).toBeNull();
  });

  it('returns null for corrupt metadata', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meta-'));
    await fs.writeFile(path.join(tmpDir, '.last-backup.json'), 'not-json', 'utf8');
    expect(await readLastBackupAt(tmpDir)).toBeNull();
  });

  it('round-trips lastBackupAt', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meta-'));
    const iso = '2026-05-23T14:30:00.000Z';
    await writeLastBackupAt(tmpDir, iso);
    expect(await readLastBackupAt(tmpDir)).toBe(iso);
  });
});
