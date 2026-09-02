import { PromotionProductScopeEnum } from '@vben/constants';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#/api/ai/model/apiKey', () => ({
  getApiKeySimpleList: vi.fn().mockResolvedValue([]),
}));

import { useFormSchema as useAiModelFormSchema } from '#/views/ai/model/model/data';
import { useFormSchema as useContactFormSchema } from '#/views/crm/contact/data';
import { useFormSchema as useReceivableFormSchema } from '#/views/crm/receivable/data';
import { useFormSchema as useRecruitPostFormSchema } from '#/views/hrm/recruit/post/data';
import { useValueFormSchema } from '#/views/mall/product/property/data';
import { useFormSchema as useCouponFormSchema } from '#/views/mall/promotion/coupon/template/data';
import { useFormSchema as useRewardActivityFormSchema } from '#/views/mall/promotion/rewardActivity/data';
import { useDataFormSchema, useTypeFormSchema } from '#/views/system/dict/data';
import { useFormSchema as useAreaFormSchema } from '#/views/system/area/data';

type Schema = {
  dependencies?: {
    resolve?: (context: any) => any;
  };
  fieldName: string;
  rules?: { safeParse: (value: unknown) => { error?: { issues: any[] }; success: boolean } };
};

function findSchema(schema: readonly any[], fieldName: string): Schema {
  const field = schema.find((item) => item.fieldName === fieldName);
  if (!field) {
    throw new Error(`Expected ${fieldName} schema field`);
  }
  return field;
}

function resolveField(schema: readonly any[], fieldName: string, values: object) {
  const resolve = findSchema(schema, fieldName).dependencies?.resolve;
  if (!resolve) {
    throw new Error(`Expected ${fieldName} to use dependencies.resolve`);
  }
  const actions = { setFieldValue: vi.fn() };
  return { actions, result: resolve({ actions, controller: {}, schema: {}, values }) };
}

describe('Task 2 form schema upgrade contracts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('derives disabled state through atomic resolvers', () => {
    expect(resolveField(useAiModelFormSchema(), 'type', { id: 1 }).result).toMatchObject({
      componentProps: { disabled: true },
    });
    expect(resolveField(useTypeFormSchema(), 'type', { id: 1 }).result).toMatchObject({
      componentProps: { disabled: true },
    });
    expect(resolveField(useDataFormSchema(), 'dictType', { id: 1 }).result).toMatchObject({
      componentProps: { disabled: true },
    });
    expect(resolveField(useValueFormSchema(), 'propertyId', { id: 1 }).result).toMatchObject({
      componentProps: { disabled: true },
    });
  });

  it('writes dependent form state only from customer selection handlers', () => {
    const contact = resolveField(useContactFormSchema(), 'customerId', {});
    contact.result.componentProps.onChange();
    expect(contact.actions.setFieldValue).toHaveBeenCalledWith('parentId', undefined);

    const receivable = resolveField(useReceivableFormSchema(), 'customerId', {});
    receivable.result.componentProps.onChange();
    expect(receivable.actions.setFieldValue.mock.calls).toEqual([
      ['contractId', undefined],
      ['planId', undefined],
      ['price', undefined],
      ['returnTime', undefined],
      ['returnType', undefined],
    ]);
  });

  it('passes the current values and form API through custom range control resolvers', () => {
    const values = { minSalary: 1000 };
    const salary = resolveField(useRecruitPostFormSchema(), 'minSalary', values);
    const age = resolveField(useRecruitPostFormSchema(), 'minAge', values);

    expect(salary.result.componentProps).toMatchObject({
      formApi: salary.actions,
      values,
    });
    expect(age.result.componentProps).toMatchObject({
      formApi: age.actions,
      values,
    });
    expect(salary.actions.setFieldValue).not.toHaveBeenCalled();
    expect(age.actions.setFieldValue).not.toHaveBeenCalled();
  });

  it('accepts IPv4 and IPv6 addresses while preserving the invalid IP message', () => {
    const rule = findSchema(useAreaFormSchema(), 'ip').rules!;
    expect(rule.safeParse('192.168.0.1').success).toBe(true);
    expect(rule.safeParse('2001:db8::1').success).toBe(true);
    const invalid = rule.safeParse('not-an-ip');
    expect(invalid.success).toBe(false);
    expect(invalid.error?.issues[0]?.message).toBe('请输入正确的 IP 地址');
  });

  it('keeps existing coupon and reward scope resolvers pure', () => {
    for (const schema of [useCouponFormSchema(), useRewardActivityFormSchema()]) {
      for (const [fieldName, productScope] of [
        ['productSpuIds', PromotionProductScopeEnum.SPU.scope],
        ['productCategoryIds', PromotionProductScopeEnum.CATEGORY.scope],
      ]) {
        const { actions, result } = resolveField(schema, fieldName as string, {
          productScope,
        });
        expect(result).toEqual({ show: true });
        expect(actions.setFieldValue).not.toHaveBeenCalled();
      }
    }
  });
});
