import { describe, expect, it, vi } from 'vitest';

import { createAndConfirmWechatWaybill } from './wechat-delivery';

describe('createAndConfirmWechatWaybill', () => {
  it('confirms the created waybill before reporting delivery success', async () => {
    const createWaybill = vi.fn().mockResolvedValue({
      id: 101,
      status: 'CREATED',
      waybillId: 'SF123456789',
    });
    const confirmPrint = vi.fn().mockResolvedValue({
      id: 101,
      printStatus: 'CONFIRMED',
      status: 'CREATED',
      waybillId: 'SF123456789',
    });

    await expect(
      createAndConfirmWechatWaybill(1, { createWaybill, confirmPrint }),
    ).resolves.toMatchObject({
      id: 101,
      printStatus: 'CONFIRMED',
      waybillId: 'SF123456789',
    });
    expect(createWaybill).toHaveBeenCalledWith(1);
    expect(confirmPrint).toHaveBeenCalledWith(101);
  });

  it('does not confirm when creating the waybill fails', async () => {
    const createWaybill = vi.fn().mockResolvedValue({
      status: 'FAILED',
      errorMessage: '顺丰服务不可用',
    });
    const confirmPrint = vi.fn();

    await expect(
      createAndConfirmWechatWaybill(1, { createWaybill, confirmPrint }),
    ).rejects.toThrow('顺丰服务不可用');
    expect(confirmPrint).not.toHaveBeenCalled();
  });

  it('allows a later call to retry confirmation for an existing waybill', async () => {
    const createWaybill = vi.fn().mockResolvedValue({
      id: 101,
      status: 'CREATED',
      waybillId: 'SF123456789',
    });
    const confirmPrint = vi
      .fn()
      .mockRejectedValueOnce(new Error('确认发货失败'))
      .mockResolvedValueOnce({
        id: 101,
        printStatus: 'CONFIRMED',
        status: 'CREATED',
        waybillId: 'SF123456789',
      });

    await expect(
      createAndConfirmWechatWaybill(1, { createWaybill, confirmPrint }),
    ).rejects.toThrow('确认发货失败');
    await expect(
      createAndConfirmWechatWaybill(1, { createWaybill, confirmPrint }),
    ).resolves.toMatchObject({ printStatus: 'CONFIRMED' });
    expect(confirmPrint).toHaveBeenCalledTimes(2);
  });
});
