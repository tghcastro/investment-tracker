#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eslint = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
const targets = [
  path.join(root, 'packages', 'bonds-domain', 'src'),
  path.join(root, 'packages', 'api', 'src'),
  path.join(root, 'packages', 'web', 'src'),
];

const result = spawnSync(process.execPath, [eslint, ...targets], {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
