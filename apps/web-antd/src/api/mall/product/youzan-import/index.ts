import type { MallSpuApi } from '#/api/mall/product/spu';

import { requestClient } from '#/api/request';

export interface ImportItem {
  key: { product: string; sku: string };
  name: string;
  specification: string;
  cents: null | number;
  stock: null | number;
  hints: Record<string, string>;
}

export interface Batch {
  batchId: string;
  confirmed: boolean;
  unusedColumns: string[];
  lines: {
    action: string;
    before?: { price: null | number; stock: null | number };
    bindingState?: 'BOUND' | 'UNBOUND' | null;
    row: { error?: string; item?: ImportItem; number: number };
  }[];
}

const root = '/product/youzan-import';
export const getAuthorizedYouzanProductMerchants = () =>
  requestClient.get<{ id: string; name: string }[]>(`${root}/merchants`);
export const template = () => requestClient.download(`${root}/template`);
export const preview = (merchantId: string, file: File) =>
  requestClient.upload<Batch>(`${root}/preview`, { file, merchantId });
export const confirmBatch = (merchantId: string, batchId: string) =>
  requestClient.post<Batch>(`${root}/confirm`, undefined, {
    params: { merchantId, batchId },
  });
export const result = (merchantId: string, batchId: string) =>
  requestClient.get<Batch>(`${root}/result`, {
    params: { merchantId, batchId },
  });
export const supplement = (
  merchantId: string,
  batchId: string,
  product: string,
  form: MallSpuApi.Spu,
  sourceByProperties: Record<string, string>,
) =>
  requestClient.post<number>(
    `${root}/supplement`,
    { batchId, product, form, sourceByProperties },
    { params: { merchantId } },
  );
