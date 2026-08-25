import { describe, expect, it } from 'vitest';

import { defaultPreferences } from '../src/config';

describe('defaultPreferences immutability test', () => {
  // 创建快照，确保默认配置对象不被修改
  it('should not modify the config object', () => {
    expect(defaultPreferences).toMatchSnapshot();
  });

  it('hides the floating-panel setting unless an app opts in', () => {
    expect(
      (defaultPreferences.app as unknown as Record<string, unknown>)
        .panelFloatSettingShow,
    ).toBe(false);
  });
});
