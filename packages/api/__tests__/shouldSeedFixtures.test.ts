import { describe, expect, it } from 'vitest';

import { shouldSeedFixtures } from '../src/shouldSeedFixtures.js';

describe('shouldSeedFixtures', () => {
  it('seeds in non-production by default', () => {
    expect(shouldSeedFixtures({ NODE_ENV: 'development' })).toBe(true);
    expect(shouldSeedFixtures({})).toBe(true);
  });

  it('skips seed in production unless SEED_FIXTURES=1', () => {
    expect(shouldSeedFixtures({ NODE_ENV: 'production' })).toBe(false);
    expect(shouldSeedFixtures({ NODE_ENV: 'production', SEED_FIXTURES: '1' })).toBe(true);
  });

  it('honors SEED_FIXTURES=0', () => {
    expect(shouldSeedFixtures({ SEED_FIXTURES: '0' })).toBe(false);
  });
});
