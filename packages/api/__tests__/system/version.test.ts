import { afterEach, describe, expect, it } from 'vitest';

import { getAppVersion } from '../../src/system/version.js';

describe('getAppVersion', () => {
  const original = process.env.APP_VERSION;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = original;
    }
  });

  it('returns dev when env is missing', () => {
    delete process.env.APP_VERSION;
    expect(getAppVersion()).toBe('dev');
  });

  it('returns trimmed APP_VERSION', () => {
    process.env.APP_VERSION = '  1.0.0  ';
    expect(getAppVersion()).toBe('1.0.0');
  });
});
