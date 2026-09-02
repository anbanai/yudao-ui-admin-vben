import type { VbenFormSchema } from '#/adapter/form';

import { createPinia, setActivePinia } from 'pinia';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { useFormSchema as aiModelSchema } from '#/views/ai/model/model/data';
import { useFormSchema as listenerSchema } from '#/views/bpm/processListener/data';
import { useFormSchema as businessSchema } from '#/views/crm/business/data';
import { schema as contractConfigSchema } from '#/views/crm/contract/config/data';
import { schema as poolConfigSchema } from '#/views/crm/customer/poolConfig/data';
import { useTransferFormSchema } from '#/views/crm/permission/modules/data';
import { useFormSchema as receivableSchema } from '#/views/crm/receivable/data';
import {
  useBalanceFormSchema,
  usePointFormSchema,
} from '#/views/member/user/data';

vi.mock('#/api/ai/model/apiKey', () => ({
  getApiKeySimpleList: vi.fn().mockResolvedValue([]),
}));

type Dependencies = NonNullable<VbenFormSchema['dependencies']>;
type Resolver = NonNullable<
  Extract<Dependencies, { resolve: unknown }>['resolve']
>;
type ResolverContext = Parameters<Resolver>[0];

function field(schema: VbenFormSchema[], fieldName: string): VbenFormSchema {
  const result = schema.find((item) => item.fieldName === fieldName);
  if (!result) throw new Error(`Missing field ${fieldName}`);
  return result;
}

async function resolve(
  schema: VbenFormSchema[],
  fieldName: string,
  values: ResolverContext['values'],
  actions = {} as ResolverContext['actions'],
) {
  const dependencies = field(schema, fieldName).dependencies;
  if (!dependencies || !('resolve' in dependencies) || !dependencies.resolve) {
    throw new Error(`Missing resolver for ${fieldName}`);
  }
  return await dependencies.resolve({
    actions,
    controller: {} as ResolverContext['controller'],
    schema: field(schema, fieldName),
    values,
  });
}

function onChange(result: Awaited<ReturnType<typeof resolve>>) {
  if (!result) throw new Error('Missing resolver result');
  const componentProps = result.componentProps;
  if (!componentProps || typeof componentProps !== 'object') {
    throw new Error('Missing resolved component props');
  }
  const handler = Reflect.get(componentProps, 'onChange');
  if (typeof handler !== 'function') throw new Error('Missing change handler');
  return handler as (value?: number | string | boolean) => void | Promise<void>;
}

describe('Task 3 wave-one dependency migration', () => {
  beforeAll(() => setActivePinia(createPinia()));

  it('uses static hide for permanently hidden transport fields', () => {
    expect(field(aiModelSchema(), 'id')).toMatchObject({ hide: true });
  });

  it.each([
    [{ enabled: true }, true],
    [{ enabled: false }, false],
  ])('resolves visibility atomically for values %#', async (values, show) => {
    await expect(
      resolve(poolConfigSchema, 'dealExpireDays', values),
    ).resolves.toEqual({ show });
  });

  it('resolves disabled state and asynchronous props in one result', async () => {
    await expect(
      resolve(receivableSchema(), 'contractId', { customerId: undefined }),
    ).resolves.toMatchObject({
      componentProps: { options: [], placeholder: '请选择客户' },
      disabled: true,
    });
  });

  it('defers CRM clears and derived prices until source-field events', async () => {
    const setFieldValue = vi.fn();
    const actions = { setFieldValue } as unknown as ResolverContext['actions'];

    const notify = await resolve(
      contractConfigSchema,
      'notifyEnabled',
      { notifyEnabled: true },
      actions,
    );
    expect(setFieldValue).not.toHaveBeenCalled();
    await onChange(notify)(false);
    await onChange(notify)(false);
    expect(setFieldValue).toHaveBeenNthCalledWith(1, 'notifyDays', undefined);
    expect(setFieldValue).toHaveBeenNthCalledWith(2, 'notifyDays', undefined);

    setFieldValue.mockClear();
    const price = await resolve(
      businessSchema(),
      'discountPercent',
      { totalProductPrice: 200 },
      actions,
    );
    await onChange(price)(25);
    await onChange(price)(0);
    expect(setFieldValue).toHaveBeenNthCalledWith(1, 'totalPrice', 150);
    expect(setFieldValue).toHaveBeenNthCalledWith(2, 'totalPrice', 200);
  });

  it('clears BPM and permission values only at their change boundaries', async () => {
    const setFieldValue = vi.fn();
    const actions = { setFieldValue } as unknown as ResolverContext['actions'];
    const type = await resolve(
      listenerSchema(),
      'type',
      { event: 'create', type: 'task' },
      actions,
    );
    expect(setFieldValue).not.toHaveBeenCalled();
    await onChange(type)('execution');
    expect(setFieldValue).toHaveBeenCalledWith('event', undefined);

    setFieldValue.mockClear();
    const owner = await resolve(
      useTransferFormSchema(),
      'oldOwnerHandler',
      { oldOwnerHandler: true },
      actions,
    );
    await onChange(owner)(false);
    expect(setFieldValue).toHaveBeenCalledWith(
      'oldOwnerPermissionLevel',
      undefined,
    );
  });

  it.each([
    [
      useBalanceFormSchema,
      'changeBalance',
      { balance: 10, changeType: 1 },
      2,
      'balanceResult',
        '12.00',
    ],
    [
      usePointFormSchema,
      'changePoint',
      { point: 10, changeType: -1 },
      2,
      'pointResult',
      8,
    ],
  ] as const)(
    'derives member result through the %s event boundary',
    async (factory, sourceField, values, input, targetField, expected) => {
      const setFieldValue = vi.fn();
      const actions = {
        setFieldValue,
      } as unknown as ResolverContext['actions'];
      const result = await resolve(factory(), sourceField, values, actions);
      expect(setFieldValue).not.toHaveBeenCalled();
      await onChange(result)(input);
      expect(setFieldValue).toHaveBeenCalledWith(targetField, expected);
    },
  );
});
