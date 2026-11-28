import { createApp, defineComponent, h } from 'vue';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { getDiyPageProperty, getDiyTemplateProperty } = vi.hoisted(() => ({
  getDiyPageProperty: vi.fn(),
  getDiyTemplateProperty: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } }),
}));

vi.mock('ant-design-vue', () => ({
  message: {
    loading: () => vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('#/api/mall/promotion/diy/page', () => ({
  getDiyPageProperty,
  updateDiyPageProperty: vi.fn(),
}));

vi.mock('#/api/mall/promotion/diy/template', () => ({
  getDiyTemplateProperty,
}));

vi.mock('#/views/mall/promotion/components', () => ({
  DiyEditor: defineComponent({
    props: { memberTabBar: { type: Object, default: undefined } },
    setup(props) {
      return () =>
        h('div', { 'data-tab-bar': JSON.stringify(props.memberTabBar) });
    },
  }),
  PAGE_LIBS: [],
}));

vi.mock(
  '#/views/mall/promotion/components/diy-editor/components/mobile/carousel/ratio',
  () => ({ prepareDiyCarouselRatios: vi.fn() }),
);

vi.mock('#/views/mall/promotion/components/diy-editor/static-assets', () => ({
  normalizeMallDiyAssetUrls: (value: unknown) => value,
}));

describe('standalone member page decorator', () => {
  let DiyPageDecorate: ReturnType<typeof defineComponent>;

  beforeAll(async () => {
    getDiyPageProperty.mockResolvedValue({
      id: 1,
      name: '我的',
      property: '{}',
      templateId: 10,
    });
    getDiyTemplateProperty.mockResolvedValue({
      property: JSON.stringify({ tabBar: { items: [{ text: '首页' }] } }),
    });
    const pageModule = await import('./index.vue');
    DiyPageDecorate = pageModule.default;
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it('loads the parent template tab bar for the member preview', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(DiyPageDecorate);

    app.mount(host);
    await vi.waitFor(() => {
      expect(host.firstElementChild?.dataset.tabBar).toBe(
        JSON.stringify({ items: [{ text: '首页' }] }),
      );
    });

    expect(getDiyTemplateProperty).toHaveBeenCalledWith(10);
    app.unmount();
    host.remove();
  });
});
