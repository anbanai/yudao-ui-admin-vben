import { MerchantStatus } from '#/api/mall/product/merchant';

export function isMerchantPathAllowed(path: string) {
  return /^\/merchant(?:\/|$)/.test(path);
}

export function isMerchantOperatingPath(path: string) {
  return /^\/merchant\/(?:products|brands|orders|after-sales)(?:\/|$)/.test(
    path,
  );
}

export function canAccessMerchantOperations(
  application: null | undefined | { merchantStatus?: number },
) {
  return application?.merchantStatus === MerchantStatus.APPROVED;
}
