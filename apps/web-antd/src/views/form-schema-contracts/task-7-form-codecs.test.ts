import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  composeFormCodecs,
  createDateRangeCodec,
  createNumberRangeCodec,
} from '#/utils/form-codec';

describe('web-antd form codecs', () => {
  it('encodes and decodes numeric ranges without mutating either input', () => {
    const codec = createNumberRangeCodec('amountRange', 'minAmount', 'maxAmount');
    const formValues = { amountRange: [10, 20] as [number, number], status: 1 };
    const encoded = codec.encode(formValues);

    expect(encoded).toEqual({ minAmount: 10, maxAmount: 20, status: 1 });
    expect(formValues).toEqual({ amountRange: [10, 20], status: 1 });

    const submitValues = { minAmount: 5, maxAmount: 8, status: 2 };
    const decoded = codec.decode(submitValues);
    expect(decoded).toEqual({ amountRange: [5, 8], status: 2 });
    expect(submitValues).toEqual({ minAmount: 5, maxAmount: 8, status: 2 });
  });

  it('handles empty and one-sided ranges while preserving unrelated fields', () => {
    const codec = createNumberRangeCodec('range', 'minimum', 'maximum');
    expect(codec.encode({ range: undefined, query: 'x' })).toEqual({ query: 'x' });
    expect(codec.encode({ range: [3, undefined], query: 'x' })).toEqual({ minimum: 3, query: 'x' });
    expect(codec.decode({ minimum: undefined, maximum: 9, query: 'x' })).toEqual({ range: [undefined, 9], query: 'x' });
  });

  it('composes multiple range codecs and formats date ranges', () => {
    const codec = composeFormCodecs(
      createNumberRangeCodec('amountRange', 'minAmount', 'maxAmount'),
      createDateRangeCodec('rangeTime', 'openingTime', 'closingTime', 'HH:mm'),
    );
    const formValues = {
      amountRange: [1, 2] as [number, number],
      rangeTime: [dayjs('2026-01-01T09:00:00'), dayjs('2026-01-01T18:00:00')],
    };
    expect(codec.encode(formValues)).toEqual({
      minAmount: 1,
      maxAmount: 2,
      openingTime: '09:00',
      closingTime: '18:00',
    });
    expect(formValues.rangeTime[0].format('HH:mm')).toBe('09:00');
    expect(codec.encode({ rangeTime: [undefined, dayjs('2026-01-01T18:00:00')] })).toEqual({
      closingTime: '18:00',
    });
    const decoded = codec.decode({
      minAmount: 1,
      maxAmount: 2,
      openingTime: '09:00',
      closingTime: '18:00',
    });
    expect(decoded.amountRange).toEqual([1, 2]);
    expect(decoded.rangeTime?.[0]?.format('HH:mm')).toBe('09:00');
    expect(decoded.rangeTime?.[1]?.format('HH:mm')).toBe('18:00');
  });
});
