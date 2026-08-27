import { describe, expect, it } from 'vitest';

import { useDeliveryInfoSchema } from './data';

describe('useDeliveryInfoSchema', () => {
  it('shows the receiver area and detail address', () => {
    const order = {
      receiverAreaName: '四川省 成都市 双流区',
      receiverDetailAddress: '天府大道 1 号',
    };
    const addressSchema = useDeliveryInfoSchema().find(
      (item) => item.label === '收货地址',
    );
    const value = order[addressSchema?.field as keyof typeof order];

    expect(addressSchema?.render?.(value, order)).toBe(
      '四川省 成都市 双流区 天府大道 1 号',
    );
  });

  it('does not show undefined when the detail address is absent', () => {
    const order = {
      receiverAreaName: '四川省 成都市 双流区',
      receiverDetailAddress: undefined,
    };
    const addressSchema = useDeliveryInfoSchema().find(
      (item) => item.label === '收货地址',
    );
    const value = order[addressSchema?.field as keyof typeof order];

    expect(addressSchema?.render?.(value, order)).toBe('四川省 成都市 双流区');
  });

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
