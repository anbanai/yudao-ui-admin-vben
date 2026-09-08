// oxlint-disable unicorn/no-array-callback-reference, unicorn/no-array-sort, unicorn/require-array-join-separator, vitest/prefer-lowercase-title, no-nested-ternary
import type { VbenFormSchema } from '#/adapter/form';

import fs from 'node:fs';
import path from 'node:path';

import { createPinia, setActivePinia } from 'pinia';
import ts from 'typescript';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { useFormSchema as aiModelSchema } from '#/views/ai/model/model/data';
import { useFormSchema as listenerSchema } from '#/views/bpm/processListener/data';
import {
  applyProductUpdate as applyBusinessProductUpdate,
  useFormSchema as businessSchema,
  calculateProductTotals as calculateBusinessTotals,
} from '#/views/crm/business/data';
import { schema as contractConfigSchema } from '#/views/crm/contract/config/data';
import {
  applyProductUpdate as applyContractProductUpdate,
  calculateProductTotals as calculateContractTotals,
} from '#/views/crm/contract/data';
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
  return handler as (value?: boolean | number | string) => Promise<void> | void;
}

function actionsWith(setFieldValue: ReturnType<typeof vi.fn>) {
  return { setFieldValue } as unknown as ResolverContext['actions'];
}

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory()
      ? sourceFiles(target)
      : /\.(?:ts|vue)$/.test(entry.name)
        ? [target]
        : [];
  });
}

function propertyName(node: ts.ObjectLiteralElementLike) {
  return node.name &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ? node.name.text
    : undefined;
}

function dependencyMismatches(file: string): string[] {
  const raw = fs.readFileSync(file, 'utf8');
  const script = file.endsWith('.vue')
    ? (raw.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '')
    : raw;
  const source = ts.createSourceFile(
    file,
    script,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const mismatches: string[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node) === 'dependencies' &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const properties = node.initializer.properties;
      const trigger = properties.find(
        (item) => propertyName(item) === 'triggerFields',
      );
      const resolver = properties.find(
        (item) => propertyName(item) === 'resolve',
      );
      if (
        trigger &&
        ts.isPropertyAssignment(trigger) &&
        ts.isArrayLiteralExpression(trigger.initializer) &&
        resolver
      ) {
        const declared = trigger.initializer.elements
          .filter(ts.isStringLiteral)
          .map((item) => item.text)
          .sort();
        const read = new Set<string>();
        function collect(current: ts.Node) {
          if (
            ts.isPropertyAccessExpression(current) &&
            ts.isIdentifier(current.expression) &&
            current.expression.text === 'values'
          ) {
            read.add(current.name.text);
          }
          if (
            ts.isElementAccessExpression(current) &&
            ts.isIdentifier(current.expression) &&
            current.expression.text === 'values' &&
            current.argumentExpression &&
            ts.isStringLiteral(current.argumentExpression)
          ) {
            read.add(current.argumentExpression.text);
          }
          if (
            ts.isVariableDeclaration(current) &&
            ts.isObjectBindingPattern(current.name) &&
            current.initializer &&
            ts.isIdentifier(current.initializer) &&
            current.initializer.text === 'values'
          ) {
            for (const element of current.name.elements) {
              const name = element.propertyName ?? element.name;
              if (ts.isIdentifier(name)) read.add(name.text);
            }
          }
          ts.forEachChild(current, collect);
        }
        collect(resolver);
        const expected = [...read].sort();
        if (declared.join() !== expected.join()) {
          const line =
            source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          mismatches.push(
            `${path.relative(process.cwd(), file)}:${line} declared=${declared.join(',')} read=${expected.join(',')}`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return mismatches;
}

describe('Task 3 wave-one dependency migration', () => {
  beforeAll(() => setActivePinia(createPinia()));

  it('uses static hide for permanently hidden transport fields', () => {
    expect(field(aiModelSchema(), 'id')).toMatchObject({ hide: true });
  });

  it('subscribes every wave-one resolver to exactly the form values it reads', () => {
    const views = path.resolve(import.meta.dirname, '..');
    const mismatches = [
      '_core',
      'ai',
      'bpm',
      'crm',
      'infra',
      'member',
      'system',
    ].flatMap((directory) =>
      sourceFiles(path.join(views, directory)).flatMap(dependencyMismatches),
    );
    expect(mismatches).toEqual([]);
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
    ['business', applyBusinessProductUpdate],
    ['contract', applyContractProductUpdate],
  ] as const)(
    'writes the atomic %s product update payload at the real boundary',
    async (_name, applyProductUpdate) => {
      const setValues = vi.fn().mockResolvedValue(undefined);
      const formData = { discountPercent: 25, id: 3 };
      await applyProductUpdate({ setValues }, formData, [
        { totalPrice: 80 },
        { totalPrice: 120 },
      ]);
      expect(setValues).toHaveBeenCalledOnce();
      expect(setValues).toHaveBeenCalledWith({
        discountPercent: 25,
        id: 3,
        products: [{ totalPrice: 80 }, { totalPrice: 120 }],
        totalPrice: 150,
        totalProductPrice: 200,
      });
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
