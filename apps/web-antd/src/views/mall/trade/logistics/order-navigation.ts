export function getTradeOrderDetailRoute(orderId: number) {
  return {
    name: 'TradeOrderDetail',
    params: { id: orderId },
  } as const;
}
