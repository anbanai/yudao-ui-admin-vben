export interface ProductMarketingConfig {
  memberLevels?: number[];
  userGroups?: number[];
  userGroupPurchaseLimits?: Record<string, number>;
  [key: string]: unknown;
}

export interface NormalizedProductMarketingConfig extends ProductMarketingConfig {
  memberLevels: number[];
  userGroups: number[];
  userGroupPurchaseLimits: Record<string, number>;
}

function normalizeIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(Number)
    .filter((id, index, ids) => Number.isSafeInteger(id) && id > 0 && ids.indexOf(id) === index);
}

export function isValidMarketingConfig(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  for (const field of ['memberLevels', 'userGroups']) {
    const ids = source[field];
    if (
      ids != null &&
      (!Array.isArray(ids) ||
        ids.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) <= 0))
    ) {
      return false;
    }
  }
  const limits = source.userGroupPurchaseLimits;
  if (limits == null) return true;
  if (typeof limits !== 'object' || Array.isArray(limits)) return false;
  return Object.entries(limits).every(
    ([id, limit]) =>
      Number.isSafeInteger(Number(id)) &&
      Number(id) > 0 &&
      Number.isSafeInteger(Number(limit)) &&
      Number(limit) >= 0,
  );
}

export function normalizeMarketingConfig(value: unknown): NormalizedProductMarketingConfig {
  const config = value && typeof value === 'object' ? value : {};
  const source = config as Record<string, unknown>;
  const userGroupPurchaseLimits =
    source.userGroupPurchaseLimits && typeof source.userGroupPurchaseLimits === 'object'
      ? Object.fromEntries(
          Object.entries(source.userGroupPurchaseLimits)
            .map(([id, limit]) => [Number(id), Number(limit)] as const)
            .filter(
              ([id, limit]) =>
                Number.isSafeInteger(id) && id > 0 && Number.isSafeInteger(limit) && limit > 0,
            )
            .map(([id, limit]) => [String(id), limit]),
        )
      : {};

  return {
    ...source,
    memberLevels: normalizeIds(source.memberLevels),
    userGroups: normalizeIds(source.userGroups),
    userGroupPurchaseLimits,
  };
}

export function setMarketingMemberLevels(
  value: unknown,
  memberLevels: unknown,
): NormalizedProductMarketingConfig {
  return {
    ...normalizeMarketingConfig(value),
    memberLevels: normalizeIds(memberLevels),
  };
}

export function setMarketingUserGroups(
  value: unknown,
  userGroups: unknown,
): NormalizedProductMarketingConfig {
  const config = normalizeMarketingConfig(value);
  const ids = normalizeIds(userGroups);
  const allowed = new Set(ids.map(String));
  return {
    ...config,
    userGroups: ids,
    userGroupPurchaseLimits: Object.fromEntries(
      Object.entries(config.userGroupPurchaseLimits ?? {}).filter(([id]) => allowed.has(id)),
    ),
  };
}

export function setUserGroupPurchaseLimit(
  value: unknown,
  userGroupId: number,
  limit: unknown,
): NormalizedProductMarketingConfig {
  const config = normalizeMarketingConfig(value);
  const limits = { ...config.userGroupPurchaseLimits };
  const normalizedLimit = Number(limit);
  if (Number.isSafeInteger(normalizedLimit) && normalizedLimit > 0) {
    limits[String(userGroupId)] = normalizedLimit;
  } else {
    delete limits[String(userGroupId)];
  }
  return { ...config, userGroupPurchaseLimits: limits };
}
