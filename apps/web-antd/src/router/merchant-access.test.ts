import { describe, expect, it } from 'vitest';

import { MerchantStatus } from '#/api/mall/product/merchant';

import {
  canAccessMerchantOperations,
  isMerchantOperatingPath,
  isMerchantPathAllowed,
} from './merchant-access';

describe('isMerchantPathAllowed', () => {
  it('allows only the merchant workbench route family', () => {
    expect(isMerchantPathAllowed('/merchant/workbench')).toBe(true);
    expect(isMerchantPathAllowed('/merchant/workbench/application')).toBe(true);
    expect(isMerchantPathAllowed('/merchant-tools')).toBe(false);
    expect(isMerchantPathAllowed('/mall/product/merchant')).toBe(false);
    expect(isMerchantPathAllowed('/dashboard')).toBe(false);
  });
});

describe('merchant operating access', () => {
  it('allows only approved merchants', () => {
    expect(
      canAccessMerchantOperations({ merchantStatus: MerchantStatus.APPROVED }),
    ).toBe(true);
  });

  it('denies change-pending, change-rejected, frozen, or missing statuses', () => {
    expect(
      canAccessMerchantOperations({
        merchantStatus: MerchantStatus.CHANGE_PENDING,
      }),
    ).toBe(false);
    expect(
      canAccessMerchantOperations({
        merchantStatus: MerchantStatus.CHANGE_REJECTED,
      }),
    ).toBe(false);
    expect(
      canAccessMerchantOperations({ merchantStatus: MerchantStatus.FROZEN }),
    ).toBe(false);
    expect(canAccessMerchantOperations({})).toBe(false);
    expect(canAccessMerchantOperations(null)).toBe(false);
  });

  it('matches only the operating routes under the merchant namespace', () => {
    expect(isMerchantOperatingPath('/merchant/products')).toBe(true);
    expect(isMerchantOperatingPath('/merchant/after-sales')).toBe(true);
    expect(isMerchantOperatingPath('/merchant/workbench')).toBe(false);
    expect(isMerchantOperatingPath('/mall/product/spu')).toBe(false);
  });
});
