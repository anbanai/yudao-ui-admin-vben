import { describe, expect, it } from 'vitest';

import {
  buildManualCommand,
  formatFen,
  mayRetryDivide,
  mayRetryRefund,
  parsePositiveId,
  validateReconciliationDate,
} from './fund-operations';

describe('financial operation commands', () => {
  it('uses the fund order ID for divide retry and trims audit fields', () => {
    expect(
      buildManualCommand(
        { kind: 'divide', targetId: 17 },
        ' 核验完成 ',
        ' 易宝工单 88 ',
      ),
    ).toEqual({
      kind: 'divide',
      data: {
        targetId: 17,
        reason: '核验完成',
        externalEvidence: '易宝工单 88',
      },
    });
  });

  it('uses the refund ID for refund retry without a client operator ID', () => {
    const command = buildManualCommand(
      { kind: 'refund', targetId: 29 },
      '退款复核',
      '工单 89',
    );
    expect(command.data).toEqual({
      targetId: 29,
      reason: '退款复核',
      externalEvidence: '工单 89',
    });
    expect(command.data).not.toHaveProperty('operatorId');
  });

  it('uses the difference ID for resolution rather than the record ID', () => {
    expect(
      buildManualCommand({ kind: 'resolve', id: 44 }, '已复核', '凭证 90'),
    ).toEqual({
      kind: 'resolve',
      data: { id: 44, reason: '已复核', externalEvidence: '凭证 90' },
    });
  });

  it('keeps the original channel, bill date and platform merchant for reconciliation', () => {
    expect(
      buildManualCommand(
        {
          kind: 'reconcile',
          channelId: 6,
          date: '2024-02-29',
          parentMerchantNo: ' 10001 ',
        },
        '重新下载',
        '工单 91',
      ),
    ).toEqual({
      kind: 'reconcile',
      data: {
        channelId: 6,
        date: '2024-02-29',
        parentMerchantNo: '10001',
        reason: '重新下载',
        externalEvidence: '工单 91',
      },
    });
  });

  it('requires positive safe IDs and nonblank reason and evidence', () => {
    for (const value of [undefined, 0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => parsePositiveId(value)).toThrow('请填写有效的正整数编号。');
    }
    expect(parsePositiveId(12)).toBe(12);
    expect(() =>
      buildManualCommand({ kind: 'divide', targetId: 1 }, ' ', '凭证'),
    ).toThrow(/请填写操作原因/);
    expect(() =>
      buildManualCommand({ kind: 'refund', targetId: 1 }, '原因', ' '),
    ).toThrow(/请填写操作原因/);
  });

  it('matches the different backend audit limits', () => {
    expect(() =>
      buildManualCommand(
        { kind: 'divide', targetId: 1 },
        'a'.repeat(513),
        '凭证',
      ),
    ).toThrow(/请填写操作原因/);
    expect(() =>
      buildManualCommand(
        { kind: 'refund', targetId: 1 },
        '原因',
        'a'.repeat(1025),
      ),
    ).toThrow(/请填写操作原因/);
    expect(() =>
      buildManualCommand(
        { kind: 'resolve', id: 1 },
        'a'.repeat(1000),
        'a'.repeat(1000),
      ),
    ).not.toThrow();
    expect(() =>
      buildManualCommand({ kind: 'resolve', id: 1 }, '原因', 'a'.repeat(1001)),
    ).toThrow(/请填写操作原因/);
    expect(() =>
      buildManualCommand(
        {
          kind: 'reconcile',
          channelId: 1,
          date: '2024-01-01',
          parentMerchantNo: 'a'.repeat(65),
        },
        '原因',
        '凭证',
      ),
    ).toThrow('请填写原平台商编，最多 64 字。');
  });

  it('rejects impossible or malformed bill dates', () => {
    for (const value of [
      '2023-02-29',
      '2024-02-30',
      '2024-13-01',
      '2024-2-01',
      '',
    ]) {
      expect(() => validateReconciliationDate(value)).toThrow(
        '请选择有效的账单日期。',
      );
    }
    expect(validateReconciliationDate('2024-02-29')).toBe('2024-02-29');
  });
});

describe('financial state presentation', () => {
  it('allows only failed/manual divide or clearing tasks, excluding active and terminal states', () => {
    expect(mayRetryDivide({ clearingStatus: 10, divideStatus: 26 })).toBe(true);
    expect(mayRetryDivide({ clearingStatus: 26, divideStatus: 0 })).toBe(true);
    expect(mayRetryDivide({ clearingStatus: 10, divideStatus: 20 })).toBe(true);
    for (const divideStatus of [undefined, 0, 5, 10, 25, 30, 999]) {
      expect(mayRetryDivide({ clearingStatus: 10, divideStatus })).toBe(false);
    }
  });

  it('allows refundable manual/failed tasks and excludes successful, active or absent tasks', () => {
    expect(mayRetryRefund([{ refundStatus: 0, divideBackStatus: 26 }])).toBe(
      true,
    );
    expect(mayRetryRefund([{ refundStatus: 20, divideBackStatus: 10 }])).toBe(
      true,
    );
    for (const refundStatus of [5, 10, 25, 30, 999]) {
      expect(mayRetryRefund([{ refundStatus, divideBackStatus: 26 }])).toBe(
        false,
      );
    }
    expect(mayRetryRefund([])).toBe(false);
    expect(mayRetryRefund(undefined)).toBe(false);
  });

  it('formats integer fen precisely and refuses unsafe values', () => {
    expect(formatFen(12_345)).toBe('123.45');
    expect(formatFen(-101)).toBe('-1.01');
    expect(formatFen(0)).toBe('0.00');
    expect(formatFen(undefined)).toBe('—');
    expect(formatFen(Number.MAX_SAFE_INTEGER + 1)).toBe('—');
    expect(formatFen(1.5)).toBe('—');
  });
});
