/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SfDevices from './sf-devices.vue';

const mocks = vi.hoisted(() => ({
  disconnect: vi.fn(),
  getPrintersList: vi.fn(),
  saveDevice: vi.fn(),
}));

vi.mock('@vben/icons', () => ({
  IconifyIcon: defineComponent(() => () => h('span')),
}));

vi.mock('print-bridge-sdk', () => ({
  PrintBridgeClient: class {
    connect = vi.fn();
    disconnect = mocks.disconnect;
    getPrintersList = mocks.getPrintersList;
    ping = vi.fn();
  },
}));

vi.mock('#/api/merchant/workbench', () => ({
  enrollMerchantPrintDevice: vi.fn(),
  getMerchantPrintDevices: async () =>
    [1, 2].map((id) => ({
      id,
      defaultFlag: id === 1,
      deviceName: `工作站 ${id}`,
      lastPollTime: Date.now(),
      status: 0,
    })),
  saveMerchantPrintDevice: mocks.saveDevice,
  testMerchantPrintDevice: vi.fn(),
}));

vi.mock('ant-design-vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ant-design-vue')>()),
  Select: defineComponent({
    props: {
      options: {
        type: Array<{ label: string; value: number }>,
        default: () => [],
      },
      value: { type: Number, default: undefined },
    },
    emits: ['change', 'update:value'],
    setup(props, { emit }) {
      return () =>
        h(
          'select',
          {
            value: props.value,
            onChange: (event: Event) => {
              const value = Number((event.target as HTMLSelectElement).value);
              emit('update:value', value);
              emit('change', value);
            },
          },
          props.options?.map(({ label, value }) =>
            h('option', { value }, label),
          ),
        );
    },
  }),
}));

describe('merchant SF printing workstations', () => {
  let app: ReturnType<typeof createApp>;
  let host: HTMLDivElement;
  let resolveDetection: (printers: Array<{ name: string }>) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getPrintersList.mockReturnValue(
      new Promise((resolve) => {
        resolveDetection = resolve;
      }),
    );
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(SfDevices, { supportedPaperSpecs: [] });
    app.mount(host);
    await vi.waitFor(() => {
      if (!button('检测本机打印机')) throw new Error('打印设备尚未加载');
    });
  });

  afterEach(() => {
    app.unmount();
    host.remove();
  });

  function button(label: string) {
    return [...host.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );
  }

  function workstation(id: number) {
    const select = host.querySelector('select')!;
    select.value = String(id);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function printerInput() {
    return host.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  }

  it('requires confirmation that the browser is on the selected workstation before detection', async () => {
    expect(button('检测本机打印机')?.disabled).toBe(true);
    host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await nextTick();
    expect(button('检测本机打印机')?.disabled).toBe(false);
    button('检测本机打印机')!.click();
    await vi.waitFor(() => expect(mocks.getPrintersList).toHaveBeenCalled());
    resolveDetection([{ name: '本机打印机' }]);
    await vi.waitFor(() => expect(printerInput().value).toBe('本机打印机'));
  });

  it('discards detection started before switching workstations', async () => {
    host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
    await nextTick();
    button('检测本机打印机')!.click();
    await vi.waitFor(() => expect(mocks.getPrintersList).toHaveBeenCalled());

    workstation(2);
    resolveDetection([{ name: '工作站 1 的打印机' }]);
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalled());
    await nextTick();

    expect(button('检测本机打印机')?.disabled).toBe(true);
    expect(printerInput().value).toBe('');
    expect(button('绑定打印机')?.disabled).toBe(true);
  });

  it('keeps manual binding available for a different workstation', async () => {
    workstation(2);
    await nextTick();
    const input = printerInput();
    input.value = '工作站 2 的打印机';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    button('绑定打印机')!.click();
    await vi.waitFor(() =>
      expect(mocks.saveDevice).toHaveBeenCalledWith({
        id: 2,
        defaultFlag: false,
        printerName: '工作站 2 的打印机',
        status: 0,
      }),
    );
  });
});
