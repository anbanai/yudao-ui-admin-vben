import { describe, expect, it } from 'vitest';

import { useDisagreeFormSchema, useRefuseFormSchema } from './data';

describe('after-sale form schemas', () => {
  it('disagree form maps the rejection reason to auditReason', () => {
    const schema = useDisagreeFormSchema();

    expect(schema.find((field) => field.fieldName === 'id')?.hide).toBe(true);
    expect(
      schema.find((field) => field.fieldName === 'auditReason')?.component,
    ).toBe('Textarea');
    expect(schema.some((field) => field.fieldName === 'reason')).toBe(false);
  });

  it('refuse form collects the required refuseMemo', () => {
    const schema = useRefuseFormSchema();

    expect(schema.find((field) => field.fieldName === 'id')?.hide).toBe(true);
    expect(
      schema.find((field) => field.fieldName === 'refuseMemo')?.component,
    ).toBe('Textarea');
  });
});
