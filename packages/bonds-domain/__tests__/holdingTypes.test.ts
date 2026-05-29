import { describe, expect, it } from 'vitest';

import { HOLDING_TYPE_SLUGS, holdingTypeSlugSchema } from '../src/holdingTypes.js';

describe('holding type slugs', () => {
  it('defines bond and brazilian-fixed-income slugs', () => {
    expect(HOLDING_TYPE_SLUGS).toEqual(['bond', 'brazilian-fixed-income']);
  });

  it('accepts known slugs in schema', () => {
    expect(holdingTypeSlugSchema.parse('bond')).toBe('bond');
    expect(holdingTypeSlugSchema.parse('brazilian-fixed-income')).toBe(
      'brazilian-fixed-income'
    );
  });

  it('rejects unknown slugs in schema', () => {
    expect(() => holdingTypeSlugSchema.parse('stock')).toThrow();
  });
});
