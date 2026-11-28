import { requestClient } from '#/api/request';

export interface YouzanCustomerImportPreview {
  batchId: number | string;
  expiresAt: number | string;
  validCount: number;
  invalidCount: number;
  rows: Array<{
    legacyPoints?: null | number;
    levelName?: null | string;
    maskedMobile: string;
    outcome: string;
    rowNumber: number;
  }>;
}

export interface YouzanCustomerImportResult {
  batchId: number | string;
  status: number;
  merchantId?: null | string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows?: number;
  skippedRows?: number;
  changedRows?: number;
  expiresAt?: null | number | string;
  rows: YouzanCustomerImportPreview['rows'];
}

export function previewYouzanCustomerImport(file: File) {
  return requestClient.upload<YouzanCustomerImportPreview>(
    '/member/youzan-import/preview',
    { file },
  );
}

export function getAuthorizedYouzanMemberMerchants() {
  return requestClient.get<string[]>('/member/youzan-import/merchants');
}

export function confirmYouzanCustomerImport(batchId: number | string) {
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

export function listPendingMemberBatches(before?: string) {
  return requestClient.get<string[]>('/member/youzan-import/pending', {
    params: { before },
  });
}

export function assignMemberBatch(
  batchId: number | string,
  merchantId: string,
) {
  return requestClient.post<YouzanCustomerImportResult>(
    '/member/youzan-import/assign',
    undefined,
    {
      params: { batchId, merchantId },
    },
  );
}
