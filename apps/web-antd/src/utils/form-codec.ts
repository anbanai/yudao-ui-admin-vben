import type { FormCodec, FormValues } from '@vben/common-ui';

import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export type NumberRange = [number | undefined, number | undefined] | undefined;

export interface NumberRangeMapping {
  rangeField: string;
  minField: string;
  maxField: string;
}

export interface DateRangeMapping {
  rangeField: string;
  startField: string;
  endField: string;
  format: string;
}

function copy(values: Readonly<FormValues>): FormValues {
  return { ...values };
}

export function createNumberRangeCodec(
  rangeField: string,
  minField: string,
  maxField: string,
): FormCodec<FormValues, FormValues> {
  return {
    encode(values) {
      const result = copy(values);
      const range = values[rangeField] as NumberRange;
      Reflect.deleteProperty(result, rangeField);
      if (range?.[0] === undefined) Reflect.deleteProperty(result, minField);
      else result[minField] = range[0];
      if (range?.[1] === undefined) Reflect.deleteProperty(result, maxField);
      else result[maxField] = range[1];
      return result;
    },
    decode(values) {
      const result = copy(values);
      const min = values[minField] as number | undefined;
      const max = values[maxField] as number | undefined;
      Reflect.deleteProperty(result, minField);
      Reflect.deleteProperty(result, maxField);
      result[rangeField] =
        min === undefined && max === undefined ? undefined : [min, max];
      return result;
    },
  };
}

function formatDate(value: unknown, format: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = dayjs(value as Date | Dayjs | number | string);
  return parsed.isValid() ? parsed.format(format) : undefined;
}

export function createDateRangeCodec(
  rangeField: string,
  startField: string,
  endField: string,
  format: string,
): FormCodec<FormValues, FormValues> {
  return {
    encode(values) {
      const result = copy(values);
      const range = values[rangeField] as
        | [unknown, unknown]
        | null
        | undefined;
      Reflect.deleteProperty(result, rangeField);
      const start = formatDate(range?.[0], format);
      const end = formatDate(range?.[1], format);
      if (start === undefined) Reflect.deleteProperty(result, startField);
      else result[startField] = start;
      if (end === undefined) Reflect.deleteProperty(result, endField);
      else result[endField] = end;
      return result;
    },
    decode(values) {
      const result = copy(values);
      const start = values[startField] as string | undefined;
      const end = values[endField] as string | undefined;
      Reflect.deleteProperty(result, startField);
      Reflect.deleteProperty(result, endField);
      result[rangeField] =
        start === undefined && end === undefined
          ? undefined
          : [
              start === undefined ? undefined : dayjs(start, format),
              end === undefined ? undefined : dayjs(end, format),
            ];
      return result;
    },
  };
}

export function composeFormCodecs(
  ...codecs: readonly FormCodec<FormValues, FormValues>[]
): FormCodec<FormValues, FormValues> {
  return {
    encode(values) {
      let current = copy(values);
      for (const codec of codecs) current = codec.encode(current);
      return current;
    },
    decode(values) {
      let current = copy(values);
      for (const codec of codecs.toReversed()) current = codec.decode(current);
      return current;
    },
  };
}

export function createNumberRangesCodec(
  mappings: readonly NumberRangeMapping[],
): FormCodec<FormValues, FormValues> {
  return composeFormCodecs(
    ...mappings.map(({ rangeField, minField, maxField }) =>
      createNumberRangeCodec(rangeField, minField, maxField),
    ),
  );
}
