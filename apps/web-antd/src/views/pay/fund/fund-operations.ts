import type { PayFundApi } from '#/api/pay/fund';

export type ManualAction =
  | {
      channelId?: number;
      date?: string;
      kind: 'reconcile';
      parentMerchantNo?: string;
    }
  | { id: number; kind: 'resolve' }
  | { kind: 'divide' | 'refund'; targetId: number };

export type ManualCommand =
  | { data: PayFundApi.ReconciliationRetry; kind: 'reconcile' }
  | { data: PayFundApi.Resolve; kind: 'resolve' }
  | { data: PayFundApi.Retry; kind: 'divide' | 'refund' };

export const fundStatusLabels: Record<number, string> = {
  0: '待处理',
  5: '处理中',
  10: '成功',
  20: '失败',
  25: '重试中',
  26: '待人工处理',
  30: '已关闭',
};

export const reconciliationStatusLabels: Record<number, string> = {
  0: '待对账',
  5: '对账中',
  10: '已完成',
  20: '失败',
  30: '待人工处理',
};

export function statusLabel(
  status: number | undefined,
  reconciliation = false,
) {
  const labels = reconciliation ? reconciliationStatusLabels : fundStatusLabels;
  return status === undefined ? '未知状态' : (labels[status] ?? '未知状态');
}

export function statusColor(status: number | undefined) {
  if (status === 10) return 'green';
  if (status === 20 || status === 26 || status === 30) return 'orange';
  if (status === 5 || status === 25) return 'blue';
  return 'default';
}

export function formatFen(amount: number | undefined): string {
  if (!Number.isSafeInteger(amount)) return '—';
  const absolute = Math.abs(amount!);
  return `${amount! < 0 ? '-' : ''}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

export function parsePositiveId(id: number | undefined): number {
  if (!Number.isSafeInteger(id) || (id ?? 0) <= 0) {
    throw new Error('请填写有效的正整数编号。');
  }
  return id!;
}

export function validateReconciliationDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('请选择有效的账单日期。');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value.startsWith('0000')
  ) {
    throw new Error('请选择有效的账单日期。');
  }
  return value;
}

export function mayRetryDivide(
  order: Pick<PayFundApi.Order, 'clearingStatus' | 'divideStatus'>,
): boolean {
  const statuses = [order.clearingStatus, order.divideStatus];
  return (
    statuses.every(
      (status) => status !== undefined && [0, 10, 20, 26].includes(status),
    ) && statuses.some((status) => status === 20 || status === 26)
  );
}

export function mayRetryRefund(
  details:
    | Pick<PayFundApi.RefundDetail, 'divideBackStatus' | 'refundStatus'>[]
    | undefined,
): boolean {
  return (
    details?.some(
      (detail) =>
        detail.refundStatus !== undefined &&
        [0, 20, 26].includes(detail.refundStatus) &&
        detail.divideBackStatus !== undefined &&
        [0, 10, 20, 26].includes(detail.divideBackStatus) &&
        (detail.refundStatus === 20 ||
          detail.refundStatus === 26 ||
          detail.divideBackStatus === 20 ||
          detail.divideBackStatus === 26),
    ) ?? false
  );
}

export function auditLimits(kind: ManualAction['kind']) {
  return kind === 'divide' || kind === 'refund'
    ? { reason: 512, externalEvidence: 1024 }
    : { reason: 1000, externalEvidence: 1000 };
}

export function buildManualCommand(
  action: ManualAction,
  reason: string,
  externalEvidence: string,
): ManualCommand {
  const audit = {
    reason: reason.trim(),
    externalEvidence: externalEvidence.trim(),
  };
  const limits = auditLimits(action.kind);
  if (
    !audit.reason ||
    !audit.externalEvidence ||
    audit.reason.length > limits.reason ||
    audit.externalEvidence.length > limits.externalEvidence
  ) {
    throw new Error(
      `请填写操作原因（最多 ${limits.reason} 字）和外部凭证（最多 ${limits.externalEvidence} 字）。`,
    );
  }
  if (action.kind === 'resolve') {
    return {
      kind: action.kind,
      data: { id: parsePositiveId(action.id), ...audit },
    };
  }
  if (action.kind === 'reconcile') {
    const parentMerchantNo = action.parentMerchantNo?.trim();
    if (!parentMerchantNo || parentMerchantNo.length > 64)
      throw new Error('请填写原平台商编，最多 64 字。');
    return {
      kind: action.kind,
      data: {
        channelId: parsePositiveId(action.channelId),
        date: validateReconciliationDate(action.date ?? ''),
        parentMerchantNo,
        ...audit,
      },
    };
  }
  return {
    kind: action.kind,
    data: { targetId: parsePositiveId(action.targetId), ...audit },
  };
}
