import { beforeEach, describe, expect, it, vi } from 'vitest';

import { disagreeAfterSale, refuseAfterSale } from './index';

const put = vi.hoisted(() => vi.fn());

vi.mock('#/api/request', () => ({
  requestClient: { put },
}));

describe('mall after-sale api', () => {
  beforeEach(() => {
    put.mockReset();
    put.mockResolvedValue(true);
  });

  it('refuseAfterSale sends id and refuseMemo as query params', async () => {
    await refuseAfterSale(7, '包装破损');

    expect(put).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledWith('/trade/after-sale/refuse', undefined, {
      params: { id: 7, refuseMemo: '包装破损' },
    });
  });

  it('disagreeAfterSale submits the auditReason in the request body', async () => {
    await disagreeAfterSale({ id: 6, auditReason: '不符合退货条件' });

    expect(put).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledWith('/trade/after-sale/disagree', {
      id: 6,
      auditReason: '不符合退货条件',
    });
  });
});
