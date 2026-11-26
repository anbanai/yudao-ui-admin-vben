import { requestClient } from '#/api/request';

export interface YouzanCustomerImportPreview {
  batchId: number;
  expiresAt: string;
  validCount: number;
  invalidCount: number;
  rows: Array<{
    rowNumber: number;
    maskedMobile: string;
    outcome: string;
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

export function confirmYouzanCustomerImport(batchId: number) {
  return requestClient.post<YouzanCustomerImportResult>(
    `/member/youzan-import/confirm?batchId=${batchId}`,
  );
}

export function getYouzanCustomerImportResult(batchId: number) {
  return requestClient.get<YouzanCustomerImportResult>(
    `/member/youzan-import/result?batchId=${batchId}`,
  );
}

export function downloadYouzanCustomerImportTemplate() {
  return requestClient.download('/member/youzan-import/template');
}
