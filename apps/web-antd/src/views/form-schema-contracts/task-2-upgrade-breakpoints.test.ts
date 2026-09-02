/* eslint-disable vue/one-component-per-file */
import type { VbenFormSchema } from '#/adapter/form';

import { createApp, defineComponent, h, nextTick } from 'vue';

import { globalShareState } from '@vben/common-ui';
import { PromotionProductScopeEnum } from '@vben/constants';

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initSetupVbenForm, useVbenForm } from '#/adapter/form';
import { useFormSchema as ai } from '#/views/ai/model/model/data';
import {
  useFormSchema as contact,
  resetContactCustomerValues,
} from '#/views/crm/contact/data';
import {
  useFormSchema as receivable,
  resetReceivableCustomerValues,
} from '#/views/crm/receivable/data';
import { useFormSchema as post } from '#/views/hrm/recruit/post/data';
import { useValueFormSchema as property } from '#/views/mall/product/property/data';
import { useFormSchema as coupon } from '#/views/mall/promotion/coupon/template/data';
import { useFormSchema as reward } from '#/views/mall/promotion/rewardActivity/data';
import { useFormSchema as area } from '#/views/system/area/data';
import {
  useDataFormSchema as dictData,
  useTypeFormSchema as dictType,
} from '#/views/system/dict/data';

import {
  COMPONENT_BIND_EVENT_MAP,
  COMPONENT_MAP,
} from '../../../../../packages/@core/ui-kit/form-ui/src/config';

vi.mock('#/api/ai/model/apiKey', () => ({
  getApiKeySimpleList: vi.fn().mockResolvedValue([]),
}));

const Capture = defineComponent({
  props: { disabled: Boolean, placeholder: String, value: null },
  setup: (props) => () =>
    h('output', {
      'data-disabled': String(props.disabled),
      'data-placeholder': props.placeholder,
    }),
});
const originalComponents = globalShareState.getComponents();
const originalInput = COMPONENT_MAP.Input;
const originalSelect = COMPONENT_MAP.Select;
const originalInputEvent = COMPONENT_BIND_EVENT_MAP.Input;
const originalSelectEvent = COMPONENT_BIND_EVENT_MAP.Select;

type Dependencies = NonNullable<VbenFormSchema['dependencies']>;
type Resolver = NonNullable<
  Extract<Dependencies, { resolve: unknown }>['resolve']
>;
type ResolverContext = Parameters<Resolver>[0];
type ResolverResult = ReturnType<Resolver>;
type ZodRule = Exclude<NonNullable<VbenFormSchema['rules']>, string>;

function field(schema: VbenFormSchema[], name: string): VbenFormSchema {
  const found = schema.find((item) => item.fieldName === name);
  if (!found) throw new Error(`Missing ${name}`);
  return found;
}
function resolve(
  schema: VbenFormSchema[],
  name: string,
  values: ResolverContext['values'],
): ResolverResult {
  const dependencies = field(schema, name).dependencies;
  if (!dependencies || !('resolve' in dependencies) || !dependencies.resolve)
    throw new Error(`Missing resolver for ${name}`);
  const context = {
    actions: {} as ResolverContext['actions'],
    controller: {} as ResolverContext['controller'],
    schema: {},
    values,
  } satisfies ResolverContext;
  const result = dependencies.resolve(context);
  if (result instanceof Promise)
    throw new Error('Expected synchronous resolver');
  return result;
}
function props(schema: VbenFormSchema[], name: string) {
  const result = field(schema, name).componentProps;
  if (!result || typeof result === 'function')
    throw new Error(`Missing static props for ${name}`);
  return result;
}
function rule(schema: VbenFormSchema[], name: string): ZodRule {
  const result = field(schema, name).rules;
  if (!result || typeof result === 'string')
    throw new Error(`Missing Zod rule for ${name}`);
  return result;
}

describe('task 2 form schema upgrade contracts', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => {
    apps.splice(0).forEach((app) => app.unmount());
    globalShareState.setComponents(originalComponents);
    COMPONENT_MAP.Input = originalInput!;
    COMPONENT_MAP.Select = originalSelect!;
    COMPONENT_BIND_EVENT_MAP.Input = originalInputEvent;
    COMPONENT_BIND_EVENT_MAP.Select = originalSelectEvent;
    document.body.innerHTML = '';
  });
  it('derives disabled state through atomic resolvers', () => {
    for (const [schema, name] of [
      [ai(), 'type'],
      [dictType(), 'type'],
      [dictData(), 'dictType'],
      [property(), 'propertyId'],
    ] as const) {
      expect(resolve(schema, name, { id: 1 })).toMatchObject({
        componentProps: { disabled: true },
      });
    }
  });
  it('binds asynchronous customer handlers through explicit schema factories', async () => {
    const onContact = vi.fn().mockResolvedValue(undefined);
    const onReceivable = vi.fn().mockResolvedValue(undefined);
    await expect(
      props(
        contact({ onCustomerChange: onContact }),
        'customerId',
      ).onChange?.(),
    ).resolves.toBeUndefined();
    await expect(
      props(
        receivable({ onCustomerChange: onReceivable }),
        'customerId',
      ).onChange?.(),
    ).resolves.toBeUndefined();
    expect(onContact).toHaveBeenCalledOnce();
    expect(onReceivable).toHaveBeenCalledOnce();
  });
  it('awaits atomic customer resets before handler completion', async () => {
    const events: string[] = [];
    let releaseContact!: () => void;
    let releaseReceivable!: () => void;
    const contactApi = {
      setValues: vi.fn(
        () =>
          new Promise<void>((done) => {
            releaseContact = () => {
              events.push('contact');
              done();
            };
          }),
      ),
    };
    const receivableApi = {
      setValues: vi.fn(
        () =>
          new Promise<void>((done) => {
            releaseReceivable = () => {
              events.push('receivable');
              done();
            };
          }),
      ),
    };
    const pending = Promise.all([
      resetContactCustomerValues(contactApi),
      resetReceivableCustomerValues(receivableApi),
    ]);
    events.push('started');
    releaseContact();
    releaseReceivable();
    await pending;
    expect(events).toEqual(['started', 'contact', 'receivable']);
    expect(contactApi.setValues).toHaveBeenCalledWith({ parentId: undefined });
    expect(receivableApi.setValues).toHaveBeenCalledWith({
      contractId: undefined,
      planId: undefined,
      price: undefined,
      returnTime: undefined,
      returnType: undefined,
    });
  });
  it('merges static and resolved props in a mounted Vben Form', async () => {
    globalShareState.setComponents({ Input: Capture, Select: Capture });
    await initSetupVbenForm();
    const schema = ai().filter(({ fieldName }) =>
      ['id', 'type'].includes(fieldName),
    );
    const [Form, formApi] = useVbenForm({ schema, showDefaultActions: false });
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({ render: () => h(Form) });
    apps.push(app);
    app.mount(host);
    await formApi.setValues({ id: 1 });
    await nextTick();
    await nextTick();
    const control = host.querySelector<HTMLElement>(
      'output[data-placeholder="请输入模型类型"]',
    );
    expect(control?.dataset.placeholder).toBe('请输入模型类型');
    expect(control?.dataset.disabled).toBe('true');
  });
  it('passes values through range resolvers without writes', () => {
    const salaryValues = { minSalary: 1000 };
    expect(resolve(post(), 'minSalary', salaryValues)).toMatchObject({
      componentProps: { values: salaryValues },
    });
    const ageValues = { minAge: 18, maxAge: 60, ageUnlimited: false };
    expect(resolve(post(), 'minAge', ageValues)).toMatchObject({
      componentProps: {
        values: ageValues,
      },
    });
  });
  it('accepts IPv4 and IPv6 and preserves the invalid IP message', () => {
    const ip = rule(area(), 'ip');
    expect(ip.safeParse('192.168.0.1').success).toBe(true);
    expect(ip.safeParse('2001:db8::1').success).toBe(true);
    const invalid = ip.safeParse('bad');
    if (invalid.success) throw new Error('Expected invalid IP');
    expect(invalid.error.issues[0]?.message).toBe('请输入正确的 IP 地址');
  });
  it('keeps existing scope resolvers pure', () => {
    for (const schema of [coupon(), reward()]) {
      expect(
        resolve(schema, 'productSpuIds', {
          productScope: PromotionProductScopeEnum.SPU.scope,
        }),
      ).toEqual({ show: true });
      expect(
        resolve(schema, 'productCategoryIds', {
          productScope: PromotionProductScopeEnum.CATEGORY.scope,
        }),
      ).toEqual({ show: true });
    }
  });
});
