import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    silent: 'passed-only',
    globals: true,
    environment: 'node',
  },
});
