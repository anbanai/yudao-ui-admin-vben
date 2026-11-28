import type { PropType } from 'vue';

import { createApp, defineComponent, h, reactive } from 'vue';

import { beforeEach, expect, it, vi } from 'vitest';

import Workbench from './workbench.vue';

const { getMine, getTypes } = vi.hoisted(() => ({
  getMine: vi.fn(),
  getTypes: vi.fn(),
}));

vi.mock('@vben/common-ui', () => ({
  Page: defineComponent(
    (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
  ),
}));
const auth = reactive({
  onboardingPlatforms: null as
    | null
    | { id: number; name: string; recommended: boolean }[],
  confirmMerchantPlatform: vi.fn(),
  refreshMerchantAccess: vi.fn(),
});

vi.mock('#/store', () => ({ useAuthStore: () => auth }));
vi.mock('ant-design-vue', async (original) => ({
  ...(await original<typeof import('ant-design-vue')>()),
  Select: defineComponent({
    props: {
      options: {
        type: Array as PropType<{ label: string; value: number }[]>,
        default: () => [],
      },
      value: { type: Number, default: null },
    },
    emits: ['update:value'],
    setup(props, { emit }) {
      return () =>
        h(
          'select',
          {
            value: props.value ?? '',
            onChange: (event: Event) =>
              emit(
                'update:value',
                Number((event.target as HTMLSelectElement).value),
              ),
          },
          props.options.map((option: { label: string; value: number }) =>
            h('option', { value: option.value }, option.label),
          ),
        );
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.onboardingPlatforms = null;
  auth.confirmMerchantPlatform.mockImplementation(async () => {
    auth.onboardingPlatforms = null;
  });
  getMine.mockResolvedValue(null);
  getTypes.mockResolvedValue([]);
});
vi.mock('#/api/mall/product/merchant', () => ({
  getMerchantApplicationHistory: async () => [],
  getMerchantApplicationMine: getMine,
  getMerchantApplicationTerms: async () => ({ available: false }),
  getMerchantBusinessTypeList: getTypes,
  MerchantStatus: { APPROVED: 20, DRAFT: 0, REJECTED: 30 },
}));

it.each(['application', 'business types'])(
  'allows a first draft only after retrying failed %s data',
  async (failure) => {
    getMine.mockResolvedValue(null);
    getTypes.mockResolvedValue([]);
    (failure === 'application' ? getMine : getTypes).mockRejectedValueOnce(
      new Error('请求的租户标识未传递'),
    );
    const host = document.createElement('div');
    const app = createApp(Workbench);
    try {
      app.mount(host);
      await vi.waitFor(() =>
        expect(host.querySelector('[aria-busy="false"]')).not.toBeNull(),
      );
      expect(host.textContent).not.toContain('保存草稿');
      const retry = [...host.querySelectorAll('button')].find((button) =>
        button.textContent.includes('重新加载'),
      );
      expect(retry).toBeDefined();
      retry!.click();
      await vi.waitFor(() => expect(host.textContent).toContain('保存草稿'));
    } finally {
      app.unmount();
    }
  },
);

it.each([
  { ids: [7], recommended: 0, expected: '7' },
  { ids: [4, 7], recommended: 7, expected: '7' },
  { ids: [4, 7], recommended: 0, expected: '' },
])(
  'selects the entry platform or waits for a choice ($ids / $recommended)',
  async ({ ids, recommended, expected }) => {
    auth.onboardingPlatforms = ids.map((id) => ({
      id,
      name: String(id),
      recommended: id === recommended,
    }));
    const host = document.createElement('div');
    const app = createApp(Workbench);
    try {
      app.mount(host);
      await vi.waitFor(() =>
        expect(host.querySelector('[aria-busy="false"]')).not.toBeNull(),
      );
      const select = host.querySelector('select')!;
      const confirm = host.querySelector('button')!;
      expect(getMine).not.toHaveBeenCalled();
      expect(select.value).toBe(expected);
      expect(confirm.disabled).toBe(!expected);
      select.value = String(ids[0]);
      select.dispatchEvent(new Event('change'));
      await vi.waitFor(() => expect(confirm.disabled).toBe(false));
      confirm.click();
      await vi.waitFor(() => expect(host.textContent).toContain('保存草稿'));
      expect(auth.confirmMerchantPlatform).toHaveBeenCalledWith(ids[0]);
    } finally {
      app.unmount();
    }
  },
);
