import { requestClient } from '#/api/request';

export namespace MallSfLogisticsApi {
  export interface Account {
    id?: number;
    name: string;
    partnerId?: string;
    partnerIdMasked?: string;
    checkWord?: string;
    monthlyCard?: string;
    monthlyCardMasked?: string;
    serviceCode: string;
    senderName: string;
    senderPhone: string;
    senderProvince: string;
    senderCity: string;
    senderDistrict?: string;
    senderAddress: string;
    defaultWeightKg: number;
    paperWidthMm: number;
    paperHeightMm: number;
    dpi: number;
    defaultFlag: boolean;
    status: number;
  }

  export interface Device {
    id?: number;
    deviceCode: string;
    deviceName: string;
    printerName?: string;
    pending?: boolean;
    enrollmentExpiresTime?: string;
    defaultFlag: boolean;
    status: number;
    version?: string;
    lastPollTime?: string;
    configFile?: string;
  }

  export interface PendingOrder {
    id: number;
    no: string;
    receiverName: string;
    receiverMobile: string;
    productCount: number;
    payPrice: number;
    createTime: string;
  }

  export interface Waybill {
    id: number;
    orderId: number;
    orderNo: string;
    providerOrderNo: string;
    waybillNo?: string;
    status:
      | 'CANCEL_UNKNOWN'
      | 'CANCELLED'
      | 'CANCELLING'
      | 'CREATED'
      | 'CREATING'
      | 'FAILED'
      | 'UNKNOWN';
    deliveryStatus: 'CONFLICT' | 'DELIVERED' | 'PENDING';
    printStatus?:
      | 'ACCEPTED'
      | 'CANCELLED'
      | 'DISPATCHED'
      | 'FAILED'
      | 'PENDING'
      | 'SUCCESS'
      | 'UNKNOWN';
    jobId?: string;
    deviceId?: number;
    reused: boolean;
    errorCode?: string;
    errorMessage?: string;
    createTime?: string;
  }

  export interface PrintTask {
    id: number;
    requestId: string;
    jobId: string;
    orderId?: number;
    waybillId?: number;
    deviceId: number;
    status: string;
    format: string;
    paperWidthMm: number;
    paperHeightMm: number;
    dpi: number;
    copies: number;
    leaseExpireTime?: string;
    lastError?: string;
    createTime?: string;
  }

  export interface Trace {
    id: number;
    status?: string;
    content: string;
    location?: string;
    operateTime: string;
  }
}

const baseUrl = '/trade/logistics/sf';

export const getSfAccounts = () =>
  requestClient.get<MallSfLogisticsApi.Account[]>(`${baseUrl}/accounts`);
export const saveSfAccount = (data: MallSfLogisticsApi.Account) =>
  requestClient.post<number>(`${baseUrl}/accounts`, data);
export const getPrintDevices = () =>
  requestClient.get<MallSfLogisticsApi.Device[]>(`${baseUrl}/devices`);
export const savePrintDevice = (data: MallSfLogisticsApi.Device) =>
  requestClient.post<MallSfLogisticsApi.Device>(`${baseUrl}/devices`, data);
export const enrollPrintDevice = () =>
  requestClient.post<MallSfLogisticsApi.Device>(`${baseUrl}/devices/enroll`);
export const createDiagnosticPayload = (data: {
  paperHeightMm: number;
  paperWidthMm: number;
}) => requestClient.post<string>(`${baseUrl}/diagnostics/test-payload`, data);
export const getPendingLogisticsOrders = () =>
  requestClient.get<MallSfLogisticsApi.PendingOrder[]>(`${baseUrl}/pending`);
export const createSfWaybill = (data: {
  accountId?: number;
  deviceId?: number;
  orderId: number;
}) =>
  requestClient.post<MallSfLogisticsApi.Waybill>(
    `${baseUrl}/waybills/create`,
    data,
  );
export const batchCreateSfWaybills = (data: {
  accountId?: number;
  deviceId?: number;
  orderIds: number[];
}) =>
  requestClient.post<MallSfLogisticsApi.Waybill[]>(
    `${baseUrl}/waybills/batch-create`,
    data,
  );
export const getSfWaybills = () =>
  requestClient.get<MallSfLogisticsApi.Waybill[]>(`${baseUrl}/waybills`);
export const cancelSfWaybill = (id: number) =>
  requestClient.post(`${baseUrl}/waybills/${id}/cancel`);
export const reprintSfWaybill = (id: number, deviceId?: number) =>
  requestClient.post<MallSfLogisticsApi.Waybill>(
    `${baseUrl}/waybills/${id}/reprint${deviceId ? `?deviceId=${deviceId}` : ''}`,
  );
export const getPrintTasks = () =>
  requestClient.get<MallSfLogisticsApi.PrintTask[]>(`${baseUrl}/print-tasks`);
export const getSfWaybillTrace = (id: number) =>
  requestClient.get<MallSfLogisticsApi.Trace[]>(
    `${baseUrl}/waybills/${id}/trace`,
  );
export const syncSfWaybillTrace = (id: number) =>
  requestClient.post<MallSfLogisticsApi.Trace[]>(
    `${baseUrl}/waybills/${id}/trace/sync`,
  );
