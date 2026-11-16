import { describe, expect, it, vi } from 'vitest';

import { useSpuGroupFilterSchema } from './group-filter';

const request = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: request }));

describe('共用商品分组筛选', () => {
  it('后台筛选仍能找到停用和内部分组，同时标注状态', async () => {
    request.get.mockResolvedValue([
      { id: 1, name: '公开', sort: 0, status: 0, storefrontVisible: true },
      { id: 2, name: '内部', sort: 0, status: 1, storefrontVisible: false },
    ]);
    const field = useSpuGroupFilterSchema()[0]!;
    const props = field.componentProps as { api: () => Promise<unknown[]> };
    expect(await props.api()).toEqual([
      {
        id: 1,
        name: '公开',
        sort: 0,
        status: 0,
        storefrontVisible: true,
        label: '公开',
      },
      {
        id: 2,
        name: '内部',
        sort: 0,
        status: 1,
        storefrontVisible: false,
        label: '内部（内部、停用）',
      },
    ]);
  });

  it('未分组与指定分组互斥，查询最多允许15个组', () => {
    const field = useSpuGroupFilterSchema()[0]!;
    const resolve = field.dependencies!.resolve as unknown as (context: {
      values: { ungrouped: boolean };
    }) => { disabled: boolean };
    expect(resolve({ values: { ungrouped: true } }).disabled).toBe(true);
    expect(resolve({ values: { ungrouped: false } }).disabled).toBe(false);
    const rules = field.rules as {
      safeParse: (value: unknown) => { success: boolean };
    };
    expect(rules.safeParse([]).success).toBe(true);
    expect(
      rules.safeParse(Array.from({ length: 15 }, (_, index) => index + 1))
        .success,
    ).toBe(true);
    expect(
      rules.safeParse(Array.from({ length: 16 }, (_, index) => index + 1))
        .success,
    ).toBe(false);
  });
});
