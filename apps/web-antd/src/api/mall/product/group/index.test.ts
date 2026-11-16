import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as groupApi from './index';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: client }));

describe('商品分组管理 API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('编辑商品显示内部和停用标识，停用分组保留为不可新增的选项', async () => {
    client.get.mockResolvedValue([
      { id: 1, name: '夏季', sort: 0, status: 0, storefrontVisible: true },
      { id: 2, name: '清仓', sort: 0, status: 1, storefrontVisible: false },
    ]);
    expect(await groupApi.getSelectableGroupList()).toEqual([
      {
        id: 1,
        name: '夏季',
        sort: 0,
        status: 0,
        storefrontVisible: true,
        label: '夏季',
        disabled: false,
      },
      {
        id: 2,
        name: '清仓',
        sort: 0,
        status: 1,
        storefrontVisible: false,
        label: '清仓（内部、停用）',
        disabled: true,
      },
    ]);
  });

  it('没有商品时不发送分组关系查询', async () => {
    expect(await groupApi.getSpuGroupMap([])).toEqual({});
    expect(client.get).not.toHaveBeenCalled();
  });

  it('大页列表按每批最多200件补充分组且去重', async () => {
    client.get.mockImplementation(async (_url, { params }) =>
      Object.fromEntries(params.spuIds.map((id: number) => [id, [7]])),
    );
    const result = await groupApi.getSpuGroupMap([
      ...Array.from({ length: 201 }, (_, index) => index + 1),
      1,
    ]);
    expect(result[201]).toEqual([7]);
    expect(Object.keys(result)).toHaveLength(201);
    expect(
      client.get.mock.calls.map((call) => call[1].params.spuIds.length),
    ).toEqual([200, 1]);
  });
});
