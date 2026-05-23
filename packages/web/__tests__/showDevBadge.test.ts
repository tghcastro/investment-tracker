import { describe, expect, it } from 'vitest';

import { showDevBadge } from '../src/showDevBadge';

describe('showDevBadge', () => {
  it('is true under the Vite test runner (DEV) or when VITE_SHOW_DEV_BANNER is set at build time', () => {
    expect(showDevBadge()).toBe(
      import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_BANNER === 'true'
    );
  });
});
