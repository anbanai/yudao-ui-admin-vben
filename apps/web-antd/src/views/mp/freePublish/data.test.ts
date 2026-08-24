import { describe, expect, it, vi } from 'vitest';

const getSimpleAccountList = vi.hoisted(() => vi.fn());
getSimpleAccountList.mockResolvedValue([]);

vi.mock('#/api/mp/account', () => ({
  getSimpleAccountList,
}));

describe('公众号发表记录账号筛选', () => {
  it('通过 ApiSelect 异步加载公众号选项', async () => {
    const { useGridFormSchema } = await import('./data');
    const accountField = useGridFormSchema().find(
      (field) => field.fieldName === 'accountId',
    );
    const componentProps = accountField?.componentProps as {
      api?: typeof getSimpleAccountList;
      labelField?: string;
      valueField?: string;
    };

    expect(accountField?.component).toBe('ApiSelect');
    expect(componentProps.api).toBe(getSimpleAccountList);
    expect(componentProps.labelField).toBe('name');
    expect(componentProps.valueField).toBe('id');
  });
});
