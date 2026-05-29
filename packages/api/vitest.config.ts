import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/vitest.setup.ts'],
    fileParallelism: false,
    hookTimeout: 30_000,
    silent: 'passed-only',
  },
});
