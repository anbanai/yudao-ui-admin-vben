import type { VbenFormSchema } from '#/adapter/form';

import { createPinia, setActivePinia } from 'pinia';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { useFormSchema as aiModelSchema } from '#/views/ai/model/model/data';
import { useFormSchema as listenerSchema } from '#/views/bpm/processListener/data';
import {
  calculateProductTotals as calculateBusinessTotals,
  useFormSchema as businessSchema,
} from '#/views/crm/business/data';
import { schema as contractConfigSchema } from '#/views/crm/contract/config/data';
import { calculateProductTotals as calculateContractTotals } from '#/views/crm/contract/data';
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

const crmApi = vi.hoisted(() => ({
  getContractSimpleList: vi.fn(),
  getReceivablePlan: vi.fn(),
  getReceivablePlanSimpleList: vi.fn(),
}));

vi.mock('#/api/crm/contract', () => ({
  getContractSimpleList: crmApi.getContractSimpleList,
}));
vi.mock('#/api/crm/receivable/plan', () => ({
  getReceivablePlan: crmApi.getReceivablePlan,
  getReceivablePlanSimpleList: crmApi.getReceivablePlanSimpleList,
}));

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

function actionsWith(setFieldValue: ReturnType<typeof vi.fn>) {
  return { setFieldValue } as unknown as ResolverContext['actions'];
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

  it.each([
    [
      calculateBusinessTotals,
      200,
      25,
      { totalPrice: 150, totalProductPrice: 200 },
    ],
    [
      calculateContractTotals,
      200,
      0,
      { totalPrice: 200, totalProductPrice: 200 },
    ],
    [calculateBusinessTotals, 0, 25, { totalPrice: 0, totalProductPrice: 0 }],
  ] as const)(
    'derives programmatic product totals at the explicit boundary',
    (calculate, totalProductPrice, discountPercent, expected) => {
      expect(calculate(totalProductPrice, discountPercent)).toEqual(expected);
    },
  );

  it.each([
    [{ enabled: false, notifyEnabled: true }, false],
    [{ enabled: true, notifyEnabled: false }, false],
    [{ enabled: true, notifyEnabled: true }, true],
  ])(
    're-evaluates notify visibility for every dependency',
    async (values, show) => {
      await expect(
        resolve(poolConfigSchema, 'notifyDays', values),
      ).resolves.toEqual({
        show,
      });
    },
  );

  it.each([
    [() => poolConfigSchema, 'notifyDays', ['enabled', 'notifyEnabled']],
    [receivableSchema, 'contractId', ['customerId', 'id']],
    [receivableSchema, 'planId', ['customerId', 'contractId', 'id']],
  ] as const)(
    'subscribes %s to every value its resolver reads',
    (factory, name, fields) => {
      expect(field(factory(), name).dependencies).toMatchObject({
        triggerFields: fields,
      });
    },
  );

  it('loads async options and defers their writes to the returned handler', async () => {
    crmApi.getContractSimpleList.mockResolvedValueOnce([
      { id: 7, name: '合同 A', totalPrice: 200, totalReceivablePrice: 50 },
    ]);
    const setFieldValue = vi.fn();
    const result = await resolve(
      receivableSchema(),
      'contractId',
      { customerId: 3 },
      actionsWith(setFieldValue),
    );
    expect(result).toMatchObject({
      componentProps: { options: [{ label: '合同 A', value: 7 }] },
      disabled: false,
    });
    expect(setFieldValue).not.toHaveBeenCalled();
    await onChange(result)(7);
    expect(setFieldValue).toHaveBeenCalledWith('price', 150);
  });

  it('defers CRM clears and derived prices until source-field events', async () => {
    const setFieldValue = vi.fn();
    const actions = actionsWith(setFieldValue);

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
    const actions = actionsWith(setFieldValue);
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
      const actions = actionsWith(setFieldValue);
      const result = await resolve(factory(), sourceField, values, actions);
      expect(setFieldValue).not.toHaveBeenCalled();
      await onChange(result)(input);
      expect(setFieldValue).toHaveBeenCalledWith(targetField, expected);
    },
  );

  it.each([
    [
      useBalanceFormSchema,
      { balance: 10, changeBalance: 2, changeType: 1 },
      -1,
      'balanceResult',
      '8.00',
    ],
    [
      usePointFormSchema,
      { point: 10, changePoint: 2, changeType: 1 },
      -1,
      'pointResult',
      8,
    ],
  ] as const)(
    'recalculates member results when changeType changes',
    async (factory, values, sign, targetField, expected) => {
      const setFieldValue = vi.fn();
      const result = await resolve(
        factory(),
        'changeType',
        values,
        actionsWith(setFieldValue),
      );
      expect(setFieldValue).not.toHaveBeenCalled();
      await onChange(result)(sign);
      await onChange(result)(1);
      await onChange(result)(sign);
      expect(setFieldValue).toHaveBeenNthCalledWith(1, targetField, expected);
      expect(setFieldValue).toHaveBeenNthCalledWith(3, targetField, expected);
    },
  );
});
