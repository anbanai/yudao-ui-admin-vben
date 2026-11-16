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

  it('defaults the theme and utility actions to follow the system and avatar menu', () => {
    expect(defaultPreferences.theme.mode).toBe('auto');
    expect(defaultPreferences.app.preferencesButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.fullscreenButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.languageToggleButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.lockScreenButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.themeToggleButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.timezoneButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.refreshButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.notificationButtonPosition).toBe(
      'user-dropdown',
    );
    expect(defaultPreferences.widget.logoutButtonPosition).toBe(
      'user-dropdown',
    );
  });
});
