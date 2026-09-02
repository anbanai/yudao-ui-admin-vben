import type { Component } from 'vue';

import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Resolver = (context: { values: Record<string, unknown> }) => {
  rules?: unknown;
  show?: boolean;
};
type FormSchema = {
  dependencies?: { resolve?: Resolver; triggerFields?: string[] };
  fieldName: string;
  hide?: boolean;
};

const formState = vi.hoisted(() => ({
  api: {
    getValues: vi.fn().mockResolvedValue({}),
    setFieldValue: vi.fn().mockResolvedValue(undefined),
    setValues: vi.fn().mockResolvedValue(undefined),
    validate: vi.fn().mockResolvedValue({ valid: true }),
  },
  options: undefined as { schema: FormSchema[] } | undefined,
}));
const modalState = vi.hoisted(() => ({
  data: {
    config: { ip: '127.0.0.1', port: 502 },
    deviceId: 7,
    protocolType: 'modbus_tcp_client',
  } as {
    config?: { ip: string; port: number };
    deviceId: number;
    protocolType: string;
  },
  options: undefined as
    | { onOpenChange?: (open: boolean) => Promise<void> | void }
    | undefined,
}));

vi.doMock('#/adapter/form', () => ({
  useVbenForm: (options: { schema: FormSchema[] }) => {
    formState.options = options;
    return [
      defineComponent({ render: () => h('div') }),
      formState.api,
    ] as const;
  },
  z: {
    number: () => ({
      default: () => ({}),
      max: () => ({ min: () => ({}) }),
      min: () => ({ max: () => ({}) }),
    }),
    string: () => ({ min: () => ({}) }),
  },
}));
vi.doMock('@vben/common-ui', () => ({
  useVbenModal: (options: typeof modalState.options) => {
    modalState.options = options ?? undefined;
    return [
      defineComponent({
        setup(_, { slots }) {
          return () => h('section', slots.default?.());
        },
      }),
      {
        close: vi.fn(),
        getData: vi.fn(() => modalState.data),
        lock: vi.fn(),
        unlock: vi.fn(),
      },
    ] as const;
  },
}));
vi.doMock('@vben/hooks', () => ({ getDictOptions: () => [] }));
vi.doMock('ant-design-vue', () => ({ message: { success: vi.fn() } }));
vi.doMock('#/api/iot/device/modbus/config', () => ({
  saveModbusConfig: vi.fn(),
}));
vi.doMock('#/api/iot/product/product', () => ({
  ProtocolTypeEnum: {
    MODBUS_TCP_CLIENT: 'modbus_tcp_client',
    MODBUS_TCP_SERVER: 'modbus_tcp_server',
  },
}));

describe('modbus form dependency runtime contract', () => {
  let app: ReturnType<typeof createApp> | undefined;

  afterEach(() => {
    app?.unmount();
    app = undefined;
    document.body.innerHTML = '';
    formState.options = undefined;
    modalState.options = undefined;
    vi.resetModules();
  });

  it('re-evaluates client/server fields from the hydrated protocol form value', async () => {
    const { default: ModbusConfigForm } = await import(
      '#/views/iot/device/device/detail/modules/modbus-config-form.vue'
    );
    const host = document.createElement('div');
    document.body.append(host);
    app = createApp(ModbusConfigForm as Component);
    app.mount(host);
    await nextTick();

    const schema = formState.options?.schema;
    expect(schema?.find((field) => field.fieldName === 'protocolType')?.hide).toBe(
      true,
    );
    expect(modalState.options?.onOpenChange).toBeTypeOf('function');
    await modalState.options?.onOpenChange?.(true);
    expect(formState.api.setValues).toHaveBeenCalledWith(modalState.data.config);
    expect(formState.api.setFieldValue).toHaveBeenCalledWith(
      'protocolType',
      modalState.data.protocolType,
    );

    formState.api.setFieldValue.mockClear();
    formState.api.setValues.mockClear();
    modalState.data = {
      config: undefined,
      deviceId: 8,
      protocolType: 'modbus_tcp_server',
    };
    await modalState.options?.onOpenChange?.(true);
    expect(formState.api.setFieldValue).toHaveBeenCalledWith(
      'protocolType',
      'modbus_tcp_server',
    );
    expect(formState.api.setValues).not.toHaveBeenCalled();

    const resolve = (fieldName: string, protocolType: string) => {
      const field = schema?.find((item) => item.fieldName === fieldName);
      const resolver = field?.dependencies?.resolve;
      if (!resolver) throw new Error(`Missing resolver for ${fieldName}`);
      return resolver({ values: { protocolType } });
    };

    expect(resolve('ip', 'modbus_tcp_client').show).toBe(true);
    expect(resolve('ip', 'modbus_tcp_server').show).toBe(false);
    expect(resolve('mode', 'modbus_tcp_server').show).toBe(true);
    expect(resolve('mode', 'modbus_tcp_client').show).toBe(false);
    expect(
      schema
        ?.filter((field) => field.dependencies)
        .every((field) =>
          field.dependencies?.triggerFields?.every(
            (name) => name === 'protocolType',
          ),
        ),
    ).toBe(true);
  });
});
