import { describe, expect, it, vi } from 'vitest';

import { agreeAndRefundAfterSale } from './refund-flow';

describe('agreeAndRefundAfterSale', () => {
  it('agrees and then starts refund for refund-only after-sales', async () => {
    const calls: string[] = [];
    const api = {
      agreeAfterSale: vi.fn(async () => calls.push('agree')),
      refundAfterSale: vi.fn(async () => calls.push('refund')),
    };

    await agreeAndRefundAfterSale(1, 10, api);

    expect(calls).toEqual(['agree', 'refund']);
  });

  it('does not start refund when agreement fails', async () => {
    const api = {
      agreeAfterSale: vi.fn(async () => {
        throw new Error('agreement failed');
      }),
      refundAfterSale: vi.fn(),
    };

    await expect(agreeAndRefundAfterSale(1, 10, api)).rejects.toThrow(
      'agreement failed',
    );
    expect(api.refundAfterSale).not.toHaveBeenCalled();
  });

  it('does not auto-refund return-and-refund after-sales', async () => {
    const api = {
      agreeAfterSale: vi.fn(async () => undefined),
      refundAfterSale: vi.fn(),
    };

    await agreeAndRefundAfterSale(1, 20, api);

    expect(api.refundAfterSale).not.toHaveBeenCalled();
  });

  it('propagates a refund failure so the caller can show the retry state', async () => {
    const api = {
      agreeAfterSale: vi.fn(async () => undefined),
      refundAfterSale: vi.fn(async () => {
        throw new Error('refund failed');
      }),
    };

    await expect(agreeAndRefundAfterSale(1, 10, api)).rejects.toThrow(
      'refund failed',
    );
    expect(api.agreeAfterSale).toHaveBeenCalledOnce();
    expect(api.refundAfterSale).toHaveBeenCalledOnce();
  });
});
