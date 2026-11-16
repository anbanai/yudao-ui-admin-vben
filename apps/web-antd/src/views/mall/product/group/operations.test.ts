import { describe, expect, it } from 'vitest';

import { buildSpuGroupUpdate, getPublicGroupLink } from './operations';

describe('商品分组操作', () => {
  it('批量加组、移组只发送显式商品和分组 ID，去重但不扩展筛选范围', () => {
    expect(buildSpuGroupUpdate([3, 7, 3], [8, 8, 9], 'remove')).toEqual({
      spuIds: [3, 7],
      groupIds: [8, 9],
      operation: 'remove',
    });
  });

  it('拒绝空选择和超限操作，避免拆批产生部分成功', () => {
    expect(() => buildSpuGroupUpdate([], [1], 'add')).toThrow(
      '请选择1至200件商品',
    );
    expect(() => buildSpuGroupUpdate([1], [], 'remove')).toThrow(
      '请选择1至15个分组',
    );
    expect(() =>
      buildSpuGroupUpdate(
        Array.from({ length: 201 }, (_, i) => i + 1),
        [1],
        'add',
      ),
    ).toThrow('请选择1至200件商品');
    expect(() =>
      buildSpuGroupUpdate(
        [1],
        Array.from({ length: 16 }, (_, i) => i + 1),
        'remove',
      ),
    ).toThrow('请选择1至15个分组');
  });

  it('仅启用的公开分组提供店铺链接', () => {
    expect(
      getPublicGroupLink({ id: 4, status: 0, storefrontVisible: true }),
    ).toBe('/pages/goods/group-list?groupIds=4');
    expect(
      getPublicGroupLink({ id: 4, status: 0, storefrontVisible: false }),
    ).toBeUndefined();
    expect(
      getPublicGroupLink({ id: 4, status: 1, storefrontVisible: true }),
    ).toBeUndefined();
  });
});
