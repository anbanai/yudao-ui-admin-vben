import { describe, expect, it } from 'vitest';

import { createLatestRequestGuard, removePendingOrders } from './pending-state';

describe('sF pending order state', () => {
  it('removes only orders whose print tasks were queued', () => {
    const orders = [{ id: 1 }, { id: 2 }, { id: 3 }];

    expect(removePendingOrders(orders, [1, 3])).toEqual([{ id: 2 }]);
  });

  it('rejects an older refresh response that arrives after the latest one', () => {
    const guard = createLatestRequestGuard();
    const olderRequest = guard.begin();
    const latestRequest = guard.begin();
    let orders = [{ id: 1 }, { id: 2 }];

    if (guard.isLatest(latestRequest)) {
      orders = [{ id: 2 }];
    }
    if (guard.isLatest(olderRequest)) {
      orders = [{ id: 1 }, { id: 2 }];
    }

    expect(orders).toEqual([{ id: 2 }]);
  });
});
