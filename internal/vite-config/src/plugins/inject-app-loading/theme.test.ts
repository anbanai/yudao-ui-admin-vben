import { beforeAll, describe, expect, it, vi } from 'vitest';

import { viteInjectAppLoadingPlugin } from './index';

let injectedScript = '';

beforeAll(async () => {
  const plugin = await viteInjectAppLoadingPlugin(
    false,
    {
      VITE_APP_NAMESPACE: 'theme-test',
    },
    'internal/vite-config/src/plugins/inject-app-loading/default-loading.html',
  );
  const transformIndexHtml =
    plugin && 'transformIndexHtml' in plugin
      ? plugin.transformIndexHtml
      : undefined;
  if (
    !transformIndexHtml ||
    typeof transformIndexHtml === 'function' ||
    !transformIndexHtml.handler
  ) {
    throw new Error('App loading HTML transform is unavailable');
  }

  const html = transformIndexHtml.handler('<html><body></body></html>');
  const match = html.match(
    /<script data-app-loading="inject-js">([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) {
    throw new Error('App loading theme script was not injected');
  }
  injectedScript = match[1];
});

function expectInjectedTheme(
  theme: null | string,
  systemPrefersDark: boolean,
  expected: boolean,
) {
  const toggle = vi.fn();
  const runScript = new Function(
    'localStorage',
    'window',
    'document',
    injectedScript,
  );
  runScript(
    { getItem: () => theme },
    { matchMedia: () => ({ matches: systemPrefersDark }) },
    { documentElement: { classList: { toggle } } },
  );
  expect(toggle).toHaveBeenCalledOnce();
  expect(toggle).toHaveBeenCalledWith('dark', expected);
}

describe('injected app loading theme', () => {
  it('uses the system preference when the cached theme is auto', () => {
    expectInjectedTheme(null, true, true);
    expectInjectedTheme('auto', true, true);
    expectInjectedTheme('auto', false, false);
    expectInjectedTheme(JSON.stringify('auto'), true, true);
    expectInjectedTheme(JSON.stringify({ value: 'auto' }), true, true);
    expectInjectedTheme(JSON.stringify('dark'), false, true);
    expectInjectedTheme(JSON.stringify({ value: 'dark' }), false, true);
  });

  it('only enables dark loading for an explicit dark theme', () => {
    expectInjectedTheme('dark', false, true);
    expectInjectedTheme('light', true, false);
  });
});
