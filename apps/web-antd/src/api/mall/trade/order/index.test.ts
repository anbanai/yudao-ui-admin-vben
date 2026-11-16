import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportOrder } from './index';

const requestClient = vi.hoisted(() => ({
  download: vi.fn(),
}));

vi.mock('#/api/request', () => ({ requestClient }));

describe('mall trade order api', () => {
  beforeEach(() => {
    requestClient.download.mockReset();
  });

  it('exports all orders matching the current filters', () => {
    const params = {
      createTime: ['2026-09-01 00:00:00', '2026-09-19 23:59:59'],
      spuName: '智能手表',
    };

    exportOrder(params);

    expect(requestClient.download).toHaveBeenCalledWith(
      '/trade/order/export-excel',
      { params },
    );
  });
});
