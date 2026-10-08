import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace MallTradeReportApi {
  export type ReportType = 'picking' | 'reconciliation';

  export interface Query extends PageParam {
    dateTime?: string[];
    statuses?: number[];
    terminal?: number;
    deliveryType?: number;
    productName?: string;
    properties?: string;
    barCode?: string;
    logisticsNo?: string;
  }

  export interface Row {
    spuId?: number;
    skuId?: number;
    productName?: string;
    picUrl?: string;
    barCode?: string;
    properties?: string;
    quantity?: number;
    amount?: number;
    orderCount?: number;
  }

  export interface ReportPage {
    total: number;
    orderCount: number;
    productTypeCount: number;
    productCount: number;
    amount: number;
    list: Row[];
  }

  export interface History {
    id: number;
    reportType: ReportType;
    orderCount: number;
    productTypeCount: number;
    productCount: number;
    amount: number;
    createTime?: string;
    filtersJson?: string;
  }
}

export function getReportPage(
  type: MallTradeReportApi.ReportType,
  params: MallTradeReportApi.Query,
) {
  return requestClient.get<MallTradeReportApi.ReportPage>(
    `/trade/report/${type}/page`,
    { params },
  );
}

export function saveReportHistory(
  type: MallTradeReportApi.ReportType,
  query: MallTradeReportApi.Query,
) {
  return requestClient.post<number>(`/trade/report/${type}/history/save`, {
    reportType: type,
    query,
  });
}

export function getReportHistoryPage(
  type: MallTradeReportApi.ReportType,
  params: PageParam,
) {
  return requestClient.get<PageResult<MallTradeReportApi.History>>(
    `/trade/report/${type}/history/page`,
    { params },
  );
}

export function getReportHistory(
  type: MallTradeReportApi.ReportType,
  id: number,
) {
  return requestClient.get<MallTradeReportApi.ReportPage>(
    `/trade/report/${type}/history/get`,
    { params: { id } },
  );
}

export function exportReportHistory(
  type: MallTradeReportApi.ReportType,
  id: number,
) {
  return requestClient.download(
    `/trade/report/${type}/history/${id}/export-excel`,
  );
}

export function exportReport(
  type: MallTradeReportApi.ReportType,
  params: MallTradeReportApi.Query,
) {
  return requestClient.download(`/trade/report/${type}/export-excel`, {
    params,
  });
}

export function exportReportDetail(
  type: MallTradeReportApi.ReportType,
  params: MallTradeReportApi.Query,
) {
  return requestClient.download(`/trade/report/${type}/export-detail-excel`, {
    params,
  });
}
