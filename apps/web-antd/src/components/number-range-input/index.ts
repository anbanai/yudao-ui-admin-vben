import type { VbenFormSchema } from '#/adapter/form';

import { markRaw } from 'vue';

import NumberRangeInput from './number-range-input.vue';

export { default as NumberRangeInput } from './number-range-input.vue';

export type NumberRangeValue = [number | undefined, number | undefined];

export function buildNumberRangeSchema(
  label: string,
  fieldName: string,
  _minFieldName: string,
  _maxFieldName: string,
  precision: number,
): VbenFormSchema {
  return {
    component: markRaw(NumberRangeInput),
    componentProps: {
      min: 0,
      precision,
    },
    fieldName,
    label,
  };
}
