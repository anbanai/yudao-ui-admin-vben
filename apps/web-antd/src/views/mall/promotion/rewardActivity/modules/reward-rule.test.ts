import { describe, expect, it } from 'vitest';

import {
  appendRewardRule,
  patchRewardRule,
  removeRewardRule,
  replaceRewardRule,
  withGiveCouponTemplateCounts,
} from './reward-rule-utils';

describe('reward rule immutable updates', () => {
  it('adds and removes rules without mutating the source array', () => {
    const source = [{ discountPrice: 5, point: 0 }];
    const appended = appendRewardRule(source);
    const removed = removeRewardRule(appended, 0);

    expect(source).toHaveLength(1);
    expect(appended).not.toBe(source);
    expect(appended).toHaveLength(2);
    expect(removed).toEqual([
      {
        discountPrice: 0,
        freeDelivery: false,
        limit: 0,
        point: 0,
      },
    ]);
  });

  it('patches or replaces one rule with a new array value', () => {
    const source = [{ discountPrice: 5, point: 0 }];
    const patched = patchRewardRule(source, 0, 'point', 10);
    const replaced = replaceRewardRule(patched, 0, {
      discountPrice: 8,
      point: 20,
    });

    expect(patched).not.toBe(source);
    expect(patched[0]).not.toBe(source[0]);
    expect(patched[0]?.point).toBe(10);
    expect(replaced).toEqual([{ discountPrice: 8, point: 20 }]);
  });

  it('creates a new rule when coupon counts change', () => {
    const source = { discountPrice: 5, point: 0 };
    const result = withGiveCouponTemplateCounts(source, [
      { giveCount: 2, id: 10 },
      { giveCount: 3, id: 20 },
    ]);

    expect(result).not.toBe(source);
    expect(result.giveCouponTemplateCounts).toEqual({ 10: 2, 20: 3 });
  });
});
