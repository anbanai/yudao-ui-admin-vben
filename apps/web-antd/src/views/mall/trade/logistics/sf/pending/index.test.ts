import { createApp } from 'vue';

import { getCurrentTimezone, setCurrentTimezone } from '@vben/utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PendingOrders from './index.vue';

const apiMocks = vi.hoisted(() => ({
  getPendingLogisticsOrders: vi.fn(),
  getPrintDevices: vi.fn(),
  getSfAccounts: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@vben/common-ui', () => ({
  Page: { template: '<main><slot /></main>' },
}));

vi.mock('ant-design-vue', async () => {
  const { Comment, defineComponent, h } =
    await vi.importActual<typeof import('vue')>('vue');
  return {
    Alert: { template: '<div />' },
    Button: { template: '<button><slot /></button>' },
    Select: { template: '<div />' },
    Space: { template: '<div><slot /></div>' },
    Table: defineComponent({
      props: {
        dataSource: { default: () => [], type: Array },
      },
      setup(props, { slots }) {
        return () => {
          const record = props.dataSource[0] as Record<string, unknown>;
          if (!record) return h('div');
          const rendered = slots.bodyCell?.({
            column: { dataIndex: 'createTime' },
            record,
          });
          const meaningful = rendered?.filter((node) => node.type !== Comment);
          return h(
            'div',
            meaningful?.length ? meaningful : String(record.createTime),
          );
        };
      },
    }),
    Tag: { template: '<span><slot /></span>' },
    message: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
  };
});

vi.mock('#/api/mall/trade/logistics/sf', () => ({
  batchCreateSfWaybills: vi.fn(),
  createSfWaybill: vi.fn(),
  getPendingLogisticsOrders: apiMocks.getPendingLogisticsOrders,
  getPrintDevices: apiMocks.getPrintDevices,
  getSfAccounts: apiMocks.getSfAccounts,
}));

describe('sF pending orders', () => {
  const originalTimezone = getCurrentTimezone();
  let app: ReturnType<typeof createApp> | undefined;
  let host: HTMLDivElement | undefined;

  beforeEach(() => {
    setCurrentTimezone('Asia/Shanghai');
    apiMocks.getPendingLogisticsOrders.mockResolvedValue([
      {
        createTime: 1_788_831_045_000,
        id: 1,
        no: 'ORDER-1',
        payPrice: 100,
        productCount: 1,
        receiverMobile: '13800000000',
        receiverName: '测试用户',
      },
    ]);
    apiMocks.getPrintDevices.mockResolvedValue([]);
    apiMocks.getSfAccounts.mockResolvedValue([]);
  });

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
    setCurrentTimezone(originalTimezone);
    vi.clearAllMocks();
  });

  it('formats millisecond order timestamps for display', async () => {
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(PendingOrders);
    app.mount(host);

    await vi.waitFor(() => {
      expect(host?.textContent).toContain('2026-09-08 09:30:45');
    });
    expect(host.textContent).not.toContain('1788831045000');
  });
});
