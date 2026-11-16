import { reactive } from 'vue';

import { describe, expect, it } from 'vitest';

import {
  initializeSidebarPreferences,
  normalizeSidebarWidth,
  overridesPreferences,
} from './preferences';

describe('web-antd preferences', () => {
  it('opts in to the floating-panel preference control', () => {
    expect(
      (overridesPreferences.app as unknown as Record<string, unknown>)
        .panelFloatSettingShow,
    ).toBe(true);
  });

  it('expands a cached sidebar width that would clip mixed-menu labels', () => {
    expect(normalizeSidebarWidth(224)).toBe(260);
  });

  it('preserves a cached sidebar width that is already wide enough', () => {
    expect(normalizeSidebarWidth(280)).toBe(280);
  });

  it('falls back to the minimum for an invalid cached width', () => {
    expect(normalizeSidebarWidth(Number.NaN)).toBe(260);
  });

  it('enforces the minimum after initialization and during the session', async () => {
    const state = reactive({ width: 224 });
    const events: string[] = [];

    const stop = await initializeSidebarPreferences({
      initialize: async () => {
        events.push('initialize');
      },
      readWidth: () => {
        events.push('read');
        return state.width;
      },
      writeWidth: (width) => {
        events.push(`write:${width}`);
        state.width = width;
      },
    });

    expect(events[0]).toBe('initialize');
    expect(state.width).toBe(260);

    state.width = 200;
    expect(state.width).toBe(260);

    stop();
  });

  it('uses the readable width as the web-antd default', () => {
    expect(overridesPreferences.sidebar?.width).toBe(260);
  });
});
