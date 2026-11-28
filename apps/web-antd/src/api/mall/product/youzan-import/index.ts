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
  merchantId?: null | string;
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
export const preview = (file: File) =>
  requestClient.upload<Batch>(`${root}/preview`, { file });
export const confirmBatch = (batchId: string) =>
  requestClient.post<Batch>(`${root}/confirm`, undefined, {
    params: { batchId },
  });
export const result = (merchantId: string | undefined, batchId: string) =>
  requestClient.get<Batch>(`${root}/result`, {
    params: { merchantId, batchId },
  });
export const listPendingProductBatches = (before?: string) =>
  requestClient.get<string[]>(`${root}/pending`, { params: { before } });
export interface DraftInput {
  batchId: string;
  product: string;
  form: MallSpuApi.Spu;
  sourceByProperties: Record<string, string>;
}

export interface ProductDraft {
  form: MallSpuApi.Spu | null;
  sourceByProperties: Record<string, string>;
  merchantId: null | string;
  spuId: null | string;
}

export const getProductDraft = (batchId: string, product: string) =>
  requestClient.get<ProductDraft>(`${root}/draft`, {
    params: { batchId, product },
  });

export const saveProductDraft = (draft: DraftInput) =>
  requestClient.post<ProductDraft>(`${root}/draft`, draft);

export const publishProductDraft = (merchantId: string, draft: DraftInput) =>
  requestClient.post<string>(`${root}/publish`, draft, {
    params: { merchantId },
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
