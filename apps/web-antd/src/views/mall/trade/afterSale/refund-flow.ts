export const AFTER_SALE_REFUND_WAY = 10;

export interface AfterSaleRefundActions {
  agreeAfterSale: (id: number) => Promise<unknown>;
  refundAfterSale: (id: number) => Promise<unknown>;
}

/** Approve an after-sale and immediately start payment refund for refund-only requests. */
export async function agreeAndRefundAfterSale(
  id: number,
  way: number | undefined,
  actions: AfterSaleRefundActions,
) {
  await actions.agreeAfterSale(id);
  if (way === AFTER_SALE_REFUND_WAY) {
    await actions.refundAfterSale(id);
  }
}
