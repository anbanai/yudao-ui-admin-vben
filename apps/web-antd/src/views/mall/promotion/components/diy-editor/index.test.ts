import type { Component } from 'vue';

import { createApp, nextTick } from 'vue';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@vben/common-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vben/common-ui')>();
  return {
    ...actual,
    Page: { template: '<div><slot /></div>' },
    useVbenModal: () => [
      { template: '<div />' },
      { close: vi.fn(), open: vi.fn() },
    ],
  };
});

vi.mock('@vben/icons', () => ({
  IconifyIcon: { template: '<i />' },
}));

const legacyBannerUrl = 'https://static.iocoder.cn/mall/banner-01.jpg';
const ossBaseUrl = 'https://teaworthshare.oss-cn-chengdu.aliyuncs.com';

let DiyEditor: Component;

describe('diy editor', () => {
  beforeAll(async () => {
    vi.stubEnv('VITE_OSS_BASE_URL', ossBaseUrl);
    const diyEditorModule = await import('./index.vue');
    DiyEditor = diyEditorModule.default;
  }, 30_000);

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('syncs normalized legacy assets to v-model before saving', async () => {
    const events: Array<{ type: 'save' | 'update'; value?: unknown }> = [];
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(DiyEditor, {
      modelValue: JSON.stringify({
        components: [],
        navigationBar: { alwaysShow: true },
        page: { backgroundImage: legacyBannerUrl },
      }),
      showNavigationBar: false,
      onSave: () => events.push({ type: 'save' }),
      'onUpdate:modelValue': (value: unknown) =>
        events.push({ type: 'update', value }),
    });
    app.mount(host);
    await nextTick();
    const buttons = host.querySelectorAll('button');
    const saveButton = buttons.item(buttons.length - 1);

    saveButton.click();
    await nextTick();

    expect(events.map((event) => event.type)).toEqual(['update', 'save']);
    expect(events[0]?.value).toContain(`${ossBaseUrl}/mall/diy/banner-01.jpg`);
    app.unmount();
    host.remove();
  });
});
