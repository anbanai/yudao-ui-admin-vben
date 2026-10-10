import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace PayFundApi {
  export interface OrderDetail {
    id: number;
    tradeOrderSubId?: number;
    merchantId?: number;
    amount?: number;
    divideAmount?: number;
    refundedAmount?: number;
    returnedAmount?: number;
    status?: number;
    channelDetailNo?: string;
  }

  export interface Order {
    id: number;
    payOrderId: number;
    tradeOrderId?: number;
    amount?: number;
    refundPrice?: number;
    clearingStatus?: number;
    divideStatus?: number;
    lastError?: string;
    nextRetryTime?: string;
    details?: OrderDetail[];
  }

  export interface RefundDetail {
    id: number;
    fundDetailId?: number;
    afterSaleId?: number;
    merchantId?: number;
    amount?: number;
    refundStatus?: number;
    divideBackStatus?: number;
    lastError?: string;
    nextRetryTime?: string;
  }

  export interface Refund {
    refundId: number;
    details?: RefundDetail[];
  }

  export interface Reconciliation {
    id: number;
    batchNo?: string;
    appId?: number;
    channelId?: number;
    merchantNo?: string;
    channelCode?: string;
    reconciliationDate?: string;
    totalCount?: number;
    totalAmount?: number;
    matchedCount?: number;
    matchedAmount?: number;
    differenceAmount?: number;
    status?: number;
    errorMsg?: string;
    startedTime?: string;
    completedTime?: string;
  }

  export interface Difference {
    id: number;
    recordId: number;
    bizType?: string;
    requestNo?: string;
    orderNo?: string;
    merchantNo?: string;
    detailNo?: string;
    localAmount?: number;
    channelAmount?: number;
    differenceAmount?: number;
    reason?: string;
    status?: number;
    operatorId?: number;
    resolutionReason?: string;
    externalEvidence?: string;
    resolvedTime?: string;
  }

  export interface ReconciliationPageQuery extends PageParam {
    status?: number;
    date?: string;
  }

  export interface DifferencePageQuery extends PageParam {
    recordId: number;
    status?: number;
  }

  export interface Audit {
    reason: string;
    externalEvidence: string;
  }

  export interface Retry extends Audit {
    targetId: number;
  }

  export interface Resolve extends Audit {
    id: number;
  }

  export interface ReconciliationRetry extends Audit {
    channelId: number;
    date: string;
    parentMerchantNo: string;
  }
}

export function getFundOrderPage(params: PageParam) {
  return requestClient.get<PageResult<PayFundApi.Order>>(
    '/pay/fund/order/page',
    { params },
  );
}

export function getFundOrder(payOrderId: number) {
  return requestClient.get<null | PayFundApi.Order>('/pay/fund/order/get', {
    params: { payOrderId },
  });
}

export function getFundRefund(refundId: number) {
  return requestClient.get<null | PayFundApi.Refund>('/pay/fund/refund/get', {
    params: { refundId },
  });
}

export function retryFundDivide(data: PayFundApi.Retry) {
  return requestClient.post<boolean>('/pay/fund/divide/retry', data);
}

export function retryFundRefund(data: PayFundApi.Retry) {
  return requestClient.post<boolean>('/pay/fund/refund/retry', data);
}

export function getReconciliationPage(
  params: PayFundApi.ReconciliationPageQuery,
) {
  return requestClient.get<PageResult<PayFundApi.Reconciliation>>(
    '/pay/reconciliation/page',
    { params },
  );
}

export function getReconciliation(id: number) {
  return requestClient.get<null | PayFundApi.Reconciliation>(
    '/pay/reconciliation/get',
    { params: { id } },
  );
}

export function getReconciliationDifferencePage(
  params: PayFundApi.DifferencePageQuery,
) {
  return requestClient.get<PageResult<PayFundApi.Difference>>(
    '/pay/reconciliation/difference-page',
    { params },
  );
}

export function resolveReconciliationDifference(data: PayFundApi.Resolve) {
  return requestClient.post<boolean>('/pay/reconciliation/resolve', data);
}

export function retryReconciliation(data: PayFundApi.ReconciliationRetry) {
  return requestClient.post<number>('/pay/reconciliation/retry', data);
}
