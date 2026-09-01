import { describe, expect, it } from 'vitest';

import { getPrintTaskErrorMessage, isPrintTaskQueued } from './delivery-status';

describe('sF print task delivery status', () => {
  it.each(['PENDING', 'DISPATCHED', 'ACCEPTED'])(
    'treats %s as queued for PrintBridge',
    (status) => {
      expect(isPrintTaskQueued(status)).toBe(true);
    },
  );

  it.each([undefined, 'FAILED', 'UNKNOWN', 'CANCELLED', 'SUCCESS'])(
    'does not treat %s as a newly queued task',
    (status) => {
      expect(isPrintTaskQueued(status)).toBe(false);
    },
  );

  it('uses the backend error before a status-specific fallback', () => {
    expect(getPrintTaskErrorMessage('FAILED', '顺丰面单下载失败')).toBe(
      '顺丰面单下载失败',
    );
    expect(getPrintTaskErrorMessage('UNKNOWN')).toContain('人工处理');
    expect(getPrintTaskErrorMessage('CANCELLED')).toContain('已取消');
  });
});
