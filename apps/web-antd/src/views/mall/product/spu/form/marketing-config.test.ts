import { describe, expect, it } from 'vitest';

import {
  isValidMarketingConfig,
  normalizeMarketingConfig,
  setMarketingUserGroups,
  setUserGroupPurchaseLimit,
} from './marketing-config';

describe('商品人群配置字段映射', () => {
  it('对损坏的人群字段采取拒绝编辑而非宽松默认', () => {
    expect(isValidMarketingConfig({ memberLevels: '12' })).toBe(false);
    expect(isValidMarketingConfig({ userGroups: [21], userGroupPurchaseLimits: [] })).toBe(false);
    expect(isValidMarketingConfig({ userGroups: [21], userGroupPurchaseLimits: { '21': 0 } })).toBe(
      true,
    );
  });

  it('保留扩展字段并将契约中的 ID 和限购值规范化', () => {
    expect(
      normalizeMarketingConfig({
        customRule: true,
        memberLevels: ['12', 13],
        userGroups: ['21'],
        userGroupPurchaseLimits: { '21': '4' },
      }),
    ).toEqual({
      customRule: true,
      memberLevels: [12, 13],
      userGroups: [21],
      userGroupPurchaseLimits: { '21': 4 },
    });
  });

  it('移除客户标签时一并移除对应限购配置', () => {
    expect(
      setMarketingUserGroups(
        {
          memberLevels: [12],
          userGroups: [21, 22],
          userGroupPurchaseLimits: { '21': 4, '22': 8 },
        },
        [22],
      ),
    ).toEqual({
      memberLevels: [12],
      userGroups: [22],
      userGroupPurchaseLimits: { '22': 8 },
    });
  });

  it('以零表示不限购并从配置映射移除该条目', () => {
    expect(
      setUserGroupPurchaseLimit(
        {
          userGroups: [21],
          userGroupPurchaseLimits: { '21': 4 },
        },
        21,
        0,
      ),
    ).toEqual({
      memberLevels: [],
      userGroups: [21],
      userGroupPurchaseLimits: {},
    });
  });
});
