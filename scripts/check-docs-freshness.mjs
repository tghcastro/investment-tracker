#!/usr/bin/env node
/**
 * Mechanical checks that agent-facing docs match the implemented repo.
 * Run: npm run check:docs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {{ id: string, run: () => string | null }} */
const checks = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const apiShipped = exists('packages/api/package.json');
const webShipped = exists('packages/web/package.json');
const domainShipped = exists('packages/bonds-domain/package.json');

const ACTIVE_CODEBASE_DOCS = [
  '.specs/codebase/ARCHITECTURE.md',
  '.specs/codebase/STRUCTURE.md',
  '.specs/codebase/STACK.md',
  '.specs/codebase/CONVENTIONS.md',
  '.specs/codebase/INTEGRATIONS.md',
  '.specs/codebase/CONCERNS.md',
];

const STALE_PHRASES = [
  { re: /pre-scaffold/i, label: 'pre-scaffold' },
  { re: /not yet in codebase/i, label: 'not yet in codebase' },
  { re: /not yet implemented in code/i, label: 'not yet implemented in code' },
  { re: /Planning phase — no application packages/i, label: 'planning-phase structure' },
  { re: /no application source code exists yet/i, label: 'no application source' },
];

const AGENT_DOC_PATHS = [
  'AGENTS.md',
  '.specs/index.md',
  '.specs/project/PROJECT.md',
  '.specs/project/ROADMAP.md',
  '.specs/project/STATE.md',
  ...ACTIVE_CODEBASE_DOCS,
  '.specs/codebase/TESTING.md',
  'docs/FRONTEND.md',
  'docs/references/node22-wsl.md',
];

/** Legacy feature paths (must use features/completed/) */
const LEGACY_FEATURE_PATH = /\.specs\/features\/m[1-4][-/]/;

checks.push({
  id: 'required-harness-files',
  run() {
    const required = ['AGENTS.md', '.cursorignore', '.specs/index.md'];
    const missing = required.filter((f) => !exists(f));
    if (missing.length) {
      return `Missing harness files: ${missing.join(', ')}`;
    }
    return null;
  },
});

checks.push({
  id: 'agents-map-size',
  run() {
    const lines = read('AGENTS.md').split('\n').length;
    if (lines > 120) {
      return `AGENTS.md has ${lines} lines (max 120 — split detail into docs/ or .specs/codebase/)`;
    }
    return null;
  },
});

checks.push({
  id: 'cursorignore-archives-completed',
  run() {
    const text = read('.cursorignore');
    if (!text.includes('.specs/features/completed/')) {
      return '.cursorignore must exclude .specs/features/completed/';
    }
    return null;
  },
});

checks.push({
  id: 'index-no-stale-codebase',
  run() {
    const index = read('.specs/index.md');
    const staleRows = index
      .split('\n')
      .filter((line) => line.includes('.specs/codebase/') && /\|\s*Stale\s*\|/i.test(line));
    if (staleRows.length) {
      return `Mark these Active in .specs/index.md or refresh content:\n${staleRows.join('\n')}`;
    }
    return null;
  },
});

if (apiShipped) {
  checks.push({
    id: 'codebase-docs-no-stale-phrases',
    run() {
      const hits = [];
      for (const rel of ACTIVE_CODEBASE_DOCS) {
        if (!exists(rel)) {
          hits.push(`${rel}: missing`);
          continue;
        }
        const text = read(rel);
        for (const { re, label } of STALE_PHRASES) {
          if (re.test(text)) {
            hits.push(`${rel}: contains "${label}"`);
          }
        }
      }
      return hits.length ? hits.join('\n') : null;
    },
  });

  checks.push({
    id: 'structure-doc-packages-api',
    run() {
      const text = read('.specs/codebase/STRUCTURE.md');
      if (!text.includes('packages/api')) {
        return 'STRUCTURE.md must document packages/api/';
      }
      return null;
    },
  });

  checks.push({
    id: 'stack-doc-implements',
    run() {
      const text = read('.specs/codebase/STACK.md');
      if (!/Implemented/i.test(text) && !/Fastify/i.test(text)) {
        return 'STACK.md should describe the implemented stack (Fastify, Drizzle, etc.)';
      }
      return null;
    },
  });

  checks.push({
    id: 'integrations-doc-packages-api',
    run() {
      const text = read('.specs/codebase/INTEGRATIONS.md');
      if (!text.includes('packages/api')) {
        return 'INTEGRATIONS.md must reference packages/api (internal REST is shipped)';
      }
      if (/apps\/api/.test(text) && !text.includes('packages/api')) {
        return 'INTEGRATIONS.md still points at planned apps/api — update to packages/api';
      }
      return null;
    },
  });
}

checks.push({
  id: 'agent-docs-no-legacy-feature-paths',
  run() {
    const hits = [];
    for (const rel of AGENT_DOC_PATHS) {
      if (!exists(rel)) continue;
      const text = read(rel);
      if (LEGACY_FEATURE_PATH.test(text)) {
        hits.push(`${rel}: uses .specs/features/m* without completed/`);
      }
    }
    return hits.length ? hits.join('\n') : null;
  },
});

checks.push({
  id: 'packages-documented-when-present',
  run() {
    if (!apiShipped) return null;
    const structure = read('.specs/codebase/STRUCTURE.md');
    const missing = [];
    if (domainShipped && !structure.includes('bonds-domain')) {
      missing.push('bonds-domain');
    }
    if (webShipped && !structure.includes('packages/web')) {
      missing.push('packages/web');
    }
    if (missing.length) {
      return `STRUCTURE.md missing: ${missing.join(', ')}`;
    }
    return null;
  },
});

const failures = [];
for (const check of checks) {
  const message = check.run();
  if (message) {
    failures.push({ id: check.id, message });
  }
}

if (failures.length === 0) {
  console.log(`check-docs-freshness: ${checks.length} checks passed`);
  process.exit(0);
}

console.error('check-docs-freshness: failed\n');
for (const { id, message } of failures) {
  console.error(`✗ ${id}\n  ${message.split('\n').join('\n  ')}\n`);
}
console.error('See docs/harness.md for remediation.');
process.exit(1);
