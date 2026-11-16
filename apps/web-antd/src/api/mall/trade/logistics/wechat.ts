import { requestClient } from '#/api/request';

export namespace MallWechatLogisticsApi {
  export interface Config {
    id?: number;
    userType: number;
    deliveryId: string;
    bizId: string;
    serviceType: number;
    serviceName: string;
    enabled: boolean;
    senderName: string;
    senderTel?: string;
    senderMobile: string;
    senderCompany?: string;
    senderPostCode?: string;
    senderCountry: string;
    senderProvince: string;
    senderCity: string;
    senderArea: string;
    senderAddress: string;
    defaultWeight: number;
    defaultSpaceLength: number;
    defaultSpaceWidth: number;
    defaultSpaceHeight: number;
    updateTime?: string;
  }

  export interface Account {
    deliveryId?: string;
    bizId?: string;
    alias?: string;
    statusCode?: number;
    statusName?: string;
    serviceTypes?: Array<{ serviceName?: string; serviceType?: number }>;
    quotaNum?: number;
  }

  export interface Delivery {
    deliveryId?: string;
    deliveryName?: string;
  }

  export interface AccountStatus {
    available?: boolean;
    message?: string;
    accounts?: Account[];
    deliveries?: Delivery[];
  }

  export type WaybillStatus =
    | 'CANCELLED'
    | 'CREATED'
    | 'CREATING'
    | 'FAILED'
    | 'UNKNOWN';
  export type PrintStatus = 'CONFIRMED' | 'PENDING';

  export interface Waybill {
    id?: number;
    orderId?: number;
    orderNo?: string;
    wechatOrderId?: string;
    deliveryId?: string;
    bizId?: string;
    waybillId?: string;
    status?: WaybillStatus;
    printStatus?: PrintStatus;
    wechatOrderStatus?: number;
    errorCode?: number;
    errorMessage?: string;
    lastSyncTime?: string;
    createTime?: string;
    updateTime?: string;
  }

  export interface Trace {
    id?: number;
    waybillId?: number;
    actionTime?: string;
    actionType?: number;
    actionMsg?: string;
  }

  export interface Printer {
    count?: number;
    openid?: string[];
    tagidList?: string[];
  }

  export interface PrinterBindReq {
    openid: string;
    updateType: 'bind' | 'unbind';
    tagidList?: string;
  }
}

const baseUrl = '/trade/logistics/wechat';

export function getWechatLogisticsConfig() {
  return requestClient.get<MallWechatLogisticsApi.Config | null>(
    `${baseUrl}/config`,
  );
}

export function saveWechatLogisticsConfig(data: MallWechatLogisticsApi.Config) {
  return requestClient.post(`${baseUrl}/config/save`, data);
}

export function getWechatLogisticsAccountStatus() {
  return requestClient.get<MallWechatLogisticsApi.AccountStatus>(
    `${baseUrl}/account-status`,
  );
}

export function getWechatLogisticsPending() {
  return requestClient.get<MallWechatLogisticsApi.Waybill[]>(
    `${baseUrl}/pending`,
  );
}

export function getWechatLogisticsHistory() {
  return requestClient.get<MallWechatLogisticsApi.Waybill[]>(
    `${baseUrl}/history`,
  );
}

export function confirmWechatWaybillPrint(id: number) {
  return requestClient.post<MallWechatLogisticsApi.Waybill>(
    `${baseUrl}/waybills/${id}/confirm-print`,
  );
}

export function cancelWechatWaybill(id: number) {
  return requestClient.post(`${baseUrl}/waybills/${id}/cancel`);
}

export function getWechatWaybill(id: number) {
  return requestClient.get<MallWechatLogisticsApi.Waybill>(
    `${baseUrl}/waybills/${id}`,
  );
}

export function getWechatWaybillTrace(id: number) {
  return requestClient.get<MallWechatLogisticsApi.Trace[]>(
    `${baseUrl}/waybills/${id}/trace`,
  );
}

export function syncWechatWaybillTrace(id: number) {
  return requestClient.post(`${baseUrl}/waybills/${id}/trace/sync`);
}

export function bindWechatPrinter(data: MallWechatLogisticsApi.PrinterBindReq) {
  return requestClient.post<MallWechatLogisticsApi.Printer>(
    `${baseUrl}/printers/bind`,
    data,
  );
}

export function getWechatPrinter() {
  return requestClient.get<MallWechatLogisticsApi.Printer>(
    `${baseUrl}/printers`,
  );
}
