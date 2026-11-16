import { describe, expect, it } from 'vitest';

import {
  isNonNegativeNumber,
  isPositiveNumber,
} from '../delivery-express-template-validation';

describe('delivery express template validation', () => {
  it('accepts positive quantities only', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
  });

  it('accepts zero and positive prices', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(1)).toBe(true);
    expect(isNonNegativeNumber(-1)).toBe(false);
  });

  it('rejects missing, NaN, and string values', () => {
    for (const value of [undefined, null, Number.NaN, '0']) {
      expect(isPositiveNumber(value)).toBe(false);
      expect(isNonNegativeNumber(value)).toBe(false);
    }
  });
});
