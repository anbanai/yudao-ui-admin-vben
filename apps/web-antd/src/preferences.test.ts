import { describe, expect, it } from 'vitest';

import { overridesPreferences } from './preferences';

describe('web-antd preferences', () => {
  it('opts in to the floating-panel preference control', () => {
    expect(
      (overridesPreferences.app as unknown as Record<string, unknown>)
        .panelFloatSettingShow,
    ).toBe(true);
  });
});
