import { requestClient } from '#/api/request';

export interface YouzanCustomerImportPreview {
  batchId: number;
  expiresAt: string;
  validCount: number;
  invalidCount: number;
  rows: Array<{
    maskedMobile: string;
    outcome: string;
    rowNumber: number;
  }>;
}

export interface YouzanCustomerImportResult {
  batchId: number;
  status: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows?: number;
  skippedRows?: number;
  changedRows?: number;
  expiresAt: string;
  rows: YouzanCustomerImportPreview['rows'];
}

export function previewYouzanCustomerImport(file: File, merchantId: string) {
  const data = new FormData();
  data.append('merchantId', merchantId);
  data.append('file', file);
  return requestClient.post<YouzanCustomerImportPreview>(
    '/member/youzan-import/preview',
    data,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
}

export function getAuthorizedYouzanMemberMerchants() {
  return requestClient.get<string[]>('/member/youzan-import/merchants');
}

export function confirmYouzanCustomerImport(batchId: number) {
  return requestClient.post<YouzanCustomerImportResult>(
    `/member/youzan-import/confirm?batchId=${batchId}`,
  );
}

export function getYouzanCustomerImportResult(batchId: number | string) {
  return requestClient.get<YouzanCustomerImportResult>(
    `/member/youzan-import/result?batchId=${batchId}`,
  );
}

export function downloadYouzanCustomerImportTemplate() {
  return requestClient.download('/member/youzan-import/template');
}
