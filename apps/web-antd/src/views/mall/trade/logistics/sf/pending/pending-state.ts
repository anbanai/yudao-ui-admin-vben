export function createLatestRequestGuard() {
  let latestRequestId = 0;

  return {
    begin() {
      latestRequestId += 1;
      return latestRequestId;
    },
    isLatest(requestId: number) {
      return requestId === latestRequestId;
    },
  };
}

export function removePendingOrders<T extends { id: number }>(
  orders: T[],
  orderIds: Iterable<number>,
) {
  const removedIds = new Set(orderIds);
  return orders.filter((order) => !removedIds.has(order.id));
}
