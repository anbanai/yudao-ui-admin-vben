import { describe, expect, it } from 'vitest';

import { useDeliveryInfoSchema } from './data';

describe('useDeliveryInfoSchema', () => {
  it('shows the logistics company and waybill number for delivered orders', () => {
    const schema = useDeliveryInfoSchema((id) =>
      id === 1 ? '顺丰速运' : undefined,
    );

    expect(
      schema.find((item) => item.field === 'logisticsId')?.render?.(1),
    ).toBe('顺丰速运');
    expect(
      schema
        .find((item) => item.field === 'logisticsNo')
        ?.render?.('SF123456789'),
    ).toBe('SF123456789');
  });
});
