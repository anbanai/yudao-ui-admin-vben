import { createApp, defineComponent, h } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import SfSettings from './sf-settings.vue';

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
}));

vi.mock('@vben/common-ui', () => ({
  Page: defineComponent(
    (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
  ),
}));

vi.mock('#/api/merchant/workbench', () => ({
  getMerchantSfConfig: mocks.getConfig,
  updateMerchantSfConfig: vi.fn(),
}));

vi.mock('./modules/sf-devices.vue', () => ({
  default: { render: () => null },
}));

let app: ReturnType<typeof createApp>;
let host: HTMLDivElement;

afterEach(() => {
  app.unmount();
  host.remove();
});

async function mountSettings(config: {
  configured: boolean;
  dpi?: number;
  paperHeightMm?: number;
  paperWidthMm?: number;
  supportedPaperSpecs: string[];
}) {
  mocks.getConfig.mockResolvedValue(config);
  host = document.createElement('div');
  document.body.append(host);
  app = createApp(SfSettings);
  app.mount(host);
  await vi.waitFor(() => expect(host.querySelector('form')).not.toBeNull());
}

it('shows incomplete shipping alongside independent return settings', async () => {
  await mountSettings({
    configured: false,
    supportedPaperSpecs: ['76x130'],
  });

  expect(host.textContent).toContain('顺丰发货设置尚未完成');
  expect(host.textContent).toContain('独立退货地址可以先保存');
  expect(host.querySelector('button[type="submit"]')).not.toBeNull();
});

it('marks saved paper unavailable when the platform no longer supports it', async () => {
  await mountSettings({
    configured: true,
    dpi: 203,
    paperHeightMm: 150,
    paperWidthMm: 100,
    supportedPaperSpecs: ['76x130'],
  });

  expect(host.textContent).toContain('顺丰发货设置尚未完成');
  expect(host.textContent).toContain('100×150 mm（已停用）');
});
