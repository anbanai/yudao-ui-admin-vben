import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportSpu, getSpuPage, getTabsCount } from './index';

const client = vi.hoisted(() => ({ get: vi.fn(), download: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: client }));

describe('商品分组查询路由', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未选择分组时保留原商品分页、计数和导出接口', async () => {
    const params = {
      pageNo: 2,
      pageSize: 20,
      name: '茶',
      groupIds: [],
      ungrouped: false,
    };
    await getSpuPage(params);
    await getTabsCount(params);
    await exportSpu(params);
    const query = { params: { pageNo: 2, pageSize: 20, name: '茶' } };
    expect(client.get).toHaveBeenNthCalledWith(1, '/product/spu/page', query);
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/product/spu/get-count',
      query,
    );
    expect(client.download).toHaveBeenCalledWith(
      '/product/spu/export-excel',
      query,
    );
  });

  it('多分组查询同时保留分类、时间和销售标签条件', async () => {
    const params = {
      pageNo: 1,
      pageSize: 10,
      groupIds: [8, 9],
      name: '茶',
      categoryIds: [2, 3],
      createTime: ['2026-09-01', '2026-09-19'],
      tabType: 1,
    };
    await getSpuPage(params);
    await getTabsCount(params);
    await exportSpu(params);
    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/product/group/spu-filter-page',
      { params },
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/product/group/spu-filter-count',
      { params },
    );
    expect(client.download).toHaveBeenCalledWith(
      '/product/group/spu-filter-export',
      { params },
    );
  });

  it('未分组筛选忽略禁用控件中保留的分组值，清空后恢复原接口', async () => {
    await getSpuPage({
      pageNo: 1,
      pageSize: 10,
      ungrouped: true,
      groupIds: [8],
    });
    expect(client.get).toHaveBeenLastCalledWith(
      '/product/group/spu-filter-page',
      {
        params: { pageNo: 1, pageSize: 10, ungrouped: true },
      },
    );
    await getSpuPage({ pageNo: 1, pageSize: 10, groupIds: undefined });
    expect(client.get).toHaveBeenLastCalledWith('/product/spu/page', {
      params: { pageNo: 1, pageSize: 10 },
    });
  });
});
