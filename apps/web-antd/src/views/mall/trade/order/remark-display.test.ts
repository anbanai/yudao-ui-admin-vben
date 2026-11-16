import { describe, expect, it } from 'vitest';

import { getOrderRemarkItems } from './remark-display';

describe('getOrderRemarkItems', () => {
  it('returns both labeled remarks and preserves their original content', () => {
    expect(
      getOrderRemarkItems({
        remark: '请尽快发货',
        userRemark: '工作日配送',
      }),
    ).toEqual([
      { key: 'merchant', label: '商家备注', content: '请尽快发货' },
      { key: 'user', label: '用户备注', content: '工作日配送' },
    ]);
  });

  it('returns only the non-empty remark', () => {
    expect(
      getOrderRemarkItems({ remark: '仅商家备注', userRemark: '  ' }),
    ).toEqual([{ key: 'merchant', label: '商家备注', content: '仅商家备注' }]);
    expect(
      getOrderRemarkItems({ remark: '', userRemark: '仅用户备注' }),
    ).toEqual([{ key: 'user', label: '用户备注', content: '仅用户备注' }]);
  });

  it('returns no items when both remarks are empty or whitespace', () => {
    expect(
      getOrderRemarkItems({ remark: undefined, userRemark: ' \n ' }),
    ).toEqual([]);
  });
});
