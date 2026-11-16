import { describe, expect, it } from 'vitest';

import { getTradeOrderDetailRoute } from './order-navigation';

describe('trade logistics order navigation', () => {
  it('builds the named order detail route from an order id', () => {
    expect(getTradeOrderDetailRoute(42)).toEqual({
      name: 'TradeOrderDetail',
      params: { id: 42 },
    });
  });
});
