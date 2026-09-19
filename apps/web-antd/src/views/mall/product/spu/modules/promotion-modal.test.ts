/* eslint-disable vue/one-component-per-file */
import type { PropType } from 'vue';

import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PromotionModal from './promotion-modal.vue';

const mocks = vi.hoisted(() => ({
  getSpu: vi.fn(),
  getWxaQrcode: vi.fn(),
  hasMemberPermission: true,
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  modalApi: {
    close: vi.fn(),
    getData: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
  },
  modalConfig: undefined as
    | undefined
    | { onOpenChange: (open: boolean) => Promise<void> },
  renderPromotionAsset: vi.fn(),
}));

vi.mock('@vben/access', () => ({
  useAccess: () => ({
    hasAccessByCodes: () => mocks.hasMemberPermission,
  }),
}));

vi.mock('@vben/common-ui', () => ({
  useVbenModal: (config: {
    onOpenChange: (open: boolean) => Promise<void>;
  }) => {
    mocks.modalConfig = config;
    return [
      defineComponent({
        name: 'TestModal',
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
          return () =>
            h(
              'section',
              { 'data-modal-title': attrs.title },
              slots.default?.(),
            );
        },
      }),
      mocks.modalApi,
    ];
  },
}));

vi.mock('@vben/icons', () => ({
  IconifyIcon: defineComponent(() => () => h('i')),
}));

vi.mock('#/api/mall/product/spu', () => ({ getSpu: mocks.getSpu }));
vi.mock('#/api/member/social', () => ({
  getWxaQrcode: mocks.getWxaQrcode,
}));
vi.mock('../promotion-renderer', () => ({
  renderPromotionAsset: mocks.renderPromotionAsset,
}));
vi.mock('./promotion-member-select.vue', () => ({
  default: defineComponent({
    emits: ['change', 'update:modelValue'],
    setup(_, { emit }) {
      return () =>
        h(
          'button',
          {
            'data-testid': 'member-27',
            onClick: () => {
              emit('update:modelValue', 27);
              emit('change', {
                avatar: 'https://static.example.com/member.png',
                id: 27,
                nickname: '推广员',
              });
            },
          },
          '选择推广员',
        );
    },
  }),
}));

vi.mock('ant-design-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ant-design-vue')>();
  const Segmented = defineComponent({
    props: {
      options: {
        required: true,
        type: Array as PropType<Array<{ label: string; value: string }>>,
      },
      value: { default: '', type: String },
    },
    emits: ['change', 'update:value'],
    setup(props, { emit }) {
      return () =>
        h(
          'div',
          props.options.map((option) =>
            h(
              'button',
              {
                'aria-pressed': props.value === option.value,
                onClick: () => {
                  emit('update:value', option.value);
                  emit('change', option.value);
                },
              },
              option.label,
            ),
          ),
        );
    },
  });
  const Tabs = defineComponent({
    props: {
      activeKey: { default: '', type: String },
      items: {
        required: true,
        type: Array as PropType<
          Array<{ disabled?: boolean; key: string; label: string }>
        >,
      },
    },
    emits: ['change', 'update:activeKey'],
    setup(props, { emit, slots }) {
      return () =>
        h('div', [
          h(
            'div',
            props.items.map((item) =>
              h(
                'button',
                {
                  'aria-pressed': props.activeKey === item.key,
                  disabled: item.disabled,
                  onClick: () => {
                    emit('update:activeKey', item.key);
                    emit('change', item.key);
                  },
                },
                item.label,
              ),
            ),
          ),
          slots.default?.(),
        ]);
    },
  });
  return {
    ...actual,
    message: {
      error: mocks.messageError,
      success: mocks.messageSuccess,
      warning: mocks.messageWarning,
    },
    Segmented,
    Tabs,
  };
});

describe('product promotion modal', () => {
  const mountedApps: Array<ReturnType<typeof createApp>> = [];
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;
  let writeClipboard: ReturnType<typeof vi.fn>;

  const activeProduct = {
    id: 88,
    marketPrice: 12_900,
    name: '最新商品名',
    picUrl: 'https://static.example.com/tea.png',
    price: 9900,
    status: 1,
  };

  function mountPromotionModal() {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(PromotionModal);
    mountedApps.push(app);
    app.mount(host);
    return { app, host };
  }

  async function flushVueUpdates() {
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();
  }

  function findButton(host: HTMLElement, label: string) {
    const button = [...host.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    if (!button) throw new Error(`Button not found: ${label}`);
    return button;
  }

  async function openActiveProduct() {
    mocks.getSpu.mockResolvedValue(activeProduct);
    mocks.modalApi.getData.mockReturnValue({ id: 88, name: '旧商品名' });
    const mounted = mountPromotionModal();
    await mocks.modalConfig!.onOpenChange(true);
    await flushVueUpdates();
    return mounted;
  }

  beforeEach(() => {
    vi.stubEnv('VITE_MALL_H5_DOMAIN', 'https://mall.example.com/product');
    mocks.getSpu.mockReset();
    mocks.getWxaQrcode.mockReset();
    mocks.renderPromotionAsset.mockReset();
    mocks.modalApi.getData.mockReset();
    mocks.modalApi.lock.mockReset();
    mocks.modalApi.unlock.mockReset();
    mocks.modalApi.close.mockReset();
    mocks.messageError.mockReset();
    mocks.messageSuccess.mockReset();
    mocks.messageWarning.mockReset();
    mocks.hasMemberPermission = true;
    let objectUrlId = 0;
    createObjectUrl = vi.fn(() => `blob:preview-${++objectUrlId}`);
    revokeObjectUrl = vi.fn();
    const TestUrl = class extends URL {};
    Object.defineProperties(TestUrl, {
      createObjectURL: { value: createObjectUrl },
      revokeObjectURL: { value: revokeObjectUrl },
    });
    vi.stubGlobal('URL', TestUrl);
    mocks.getWxaQrcode.mockResolvedValue('data:image/png;base64,qr');
    mocks.renderPromotionAsset.mockResolvedValue(
      new Blob(['png'], { type: 'image/png' }),
    );
    writeClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeClipboard },
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    for (const app of mountedApps) app.unmount();
    mountedApps.length = 0;
    document.body.innerHTML = '';
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('打开时重新读取商品并使用最新数据', async () => {
    mocks.getSpu.mockResolvedValue(activeProduct);
    mocks.modalApi.getData.mockReturnValue({ id: 88, name: '旧商品名' });
    const { host } = mountPromotionModal();

    await mocks.modalConfig!.onOpenChange(true);
    await flushVueUpdates();

    expect(mocks.getSpu).toHaveBeenCalledWith(88);
    expect(host.textContent).toContain('最新商品名');
    expect(mocks.getWxaQrcode).toHaveBeenCalledWith(
      expect.objectContaining({ scene: 'spm=0.2.88.3.2' }),
    );
  });

  it('商品校验完成后先解锁弹窗再生成预览', async () => {
    await openActiveProduct();

    expect(mocks.modalApi.unlock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.renderPromotionAsset.mock.invocationCallOrder[0]!,
    );
  });

  it('最新商品已下架时阻止生成推广素材', async () => {
    mocks.getSpu.mockResolvedValue({ ...activeProduct, status: 0 });
    mocks.modalApi.getData.mockReturnValue({ ...activeProduct, status: 1 });
    const { host } = mountPromotionModal();

    await mocks.modalConfig!.onOpenChange(true);
    await flushVueUpdates();

    expect(host.textContent).toContain('仅支持推广已上架商品');
    expect(mocks.getWxaQrcode).not.toHaveBeenCalled();
    expect(mocks.renderPromotionAsset).not.toHaveBeenCalled();
  });

  it('无会员查询权限时隐藏指定推广员模式', async () => {
    mocks.hasMemberPermission = false;
    const { host } = await openActiveProduct();

    expect(host.textContent).toContain('店铺公共');
    expect(host.textContent).not.toContain('指定推广员');
    expect(host.querySelector('[data-testid="member-27"]')).toBeNull();
  });

  it('选择会员 27 后同时更新小程序和 H5 推广参数', async () => {
    const { host } = await openActiveProduct();

    findButton(host, '指定推广员').click();
    await flushVueUpdates();
    (host.querySelector('[data-testid="member-27"]') as HTMLElement).click();
    await flushVueUpdates();

    expect(mocks.getWxaQrcode).toHaveBeenLastCalledWith(
      expect.objectContaining({ scene: 'spm=27.2.88.3.2' }),
    );
    expect(mocks.renderPromotionAsset).toHaveBeenLastCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          h5Url: expect.stringContaining('spm=27.2.88.1.3'),
          miniProgramScene: 'spm=27.2.88.3.2',
        }),
      }),
    );
  });

  it('等待选择推广员时不把有效 H5 域名提示为未配置', async () => {
    const { host } = await openActiveProduct();

    findButton(host, '指定推广员').click();
    await flushVueUpdates();

    expect(host.textContent).not.toContain('请配置 VITE_MALL_H5_DOMAIN');
    expect(findButton(host, 'H5 二维码').hasAttribute('disabled')).toBe(true);
    expect(findButton(host, '推广链接').hasAttribute('disabled')).toBe(true);
  });

  it('身份变化时撤销旧地址并清空素材缓存', async () => {
    const { host } = await openActiveProduct();

    findButton(host, '指定推广员').click();
    await flushVueUpdates();
    (host.querySelector('[data-testid="member-27"]') as HTMLElement).click();
    await flushVueUpdates();
    findButton(host, '店铺公共').click();
    await flushVueUpdates();

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-1');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-2');
    expect(mocks.renderPromotionAsset).toHaveBeenCalledTimes(3);
  });

  it('重复访问相同身份和类型时复用已生成素材', async () => {
    const { host } = await openActiveProduct();

    findButton(host, '商品卡片').click();
    await flushVueUpdates();
    findButton(host, '商品海报').click();
    await flushVueUpdates();

    expect(mocks.renderPromotionAsset).toHaveBeenCalledTimes(2);
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
  });

  it('小程序二维码失败只影响海报和卡片', async () => {
    mocks.getWxaQrcode.mockRejectedValue(new Error('二维码服务不可用'));
    const { host } = await openActiveProduct();
    expect(host.textContent).toContain('二维码服务不可用');

    findButton(host, 'H5 二维码').click();
    await flushVueUpdates();

    expect(mocks.renderPromotionAsset).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'h5' }),
    );
    expect(host.textContent).toContain('下载 PNG');

    findButton(host, '推广链接').click();
    await flushVueUpdates();
    expect(
      (host.querySelector('input[readonly]') as HTMLInputElement).value,
    ).toContain('https://mall.example.com/product');
  });

  it('h5 配置无效时仅禁用 H5 和链接选项', async () => {
    vi.stubEnv('VITE_MALL_H5_DOMAIN', 'not-a-url');
    const { host } = await openActiveProduct();

    expect(host.textContent).toContain('请配置 VITE_MALL_H5_DOMAIN');
    expect(findButton(host, '商品海报').hasAttribute('disabled')).toBe(false);
    expect(findButton(host, '商品卡片').hasAttribute('disabled')).toBe(false);
    expect(findButton(host, 'H5 二维码').hasAttribute('disabled')).toBe(true);
    expect(findButton(host, '推广链接').hasAttribute('disabled')).toBe(true);

    findButton(host, '商品卡片').click();
    await flushVueUpdates();
    expect(mocks.renderPromotionAsset).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'card' }),
    );
  });

  it('关闭时撤销全部预览地址', async () => {
    const { host } = await openActiveProduct();
    findButton(host, '商品卡片').click();
    await flushVueUpdates();
    findButton(host, 'H5 二维码').click();
    await flushVueUpdates();

    await mocks.modalConfig!.onOpenChange(false);

    expect(revokeObjectUrl.mock.calls.map(([url]) => url).toSorted()).toEqual([
      'blob:preview-1',
      'blob:preview-2',
      'blob:preview-3',
    ]);
  });

  it('按素材类型下载对应的安全文件名', async () => {
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      },
    );
    const { host } = await openActiveProduct();

    findButton(host, '下载 PNG').click();
    findButton(host, '商品卡片').click();
    await vi.waitFor(() => {
      expect(findButton(host, '商品卡片').getAttribute('aria-pressed')).toBe(
        'true',
      );
      expect(mocks.renderPromotionAsset).toHaveBeenCalledTimes(2);
      expect(host.textContent).toContain('下载 PNG');
    });
    findButton(host, '下载 PNG').click();
    findButton(host, 'H5 二维码').click();
    await vi.waitFor(() => {
      expect(findButton(host, 'H5 二维码').getAttribute('aria-pressed')).toBe(
        'true',
      );
      expect(mocks.renderPromotionAsset).toHaveBeenCalledTimes(3);
      expect(host.textContent).toContain('下载 PNG');
    });
    findButton(host, '下载 PNG').click();

    expect(downloads).toEqual([
      '最新商品名商品海报.png',
      '最新商品名商品卡片.png',
      '最新商品名H5二维码.png',
    ]);
  });

  it('复制或打开当前推广链接', async () => {
    const { host } = await openActiveProduct();
    findButton(host, '推广链接').click();
    await flushVueUpdates();

    findButton(host, '复制链接').click();
    await flushVueUpdates();
    const expectedUrl = 'https://mall.example.com/product?spm=0.2.88.1.3';
    expect(writeClipboard).toHaveBeenCalledWith(expectedUrl);
    expect(mocks.messageSuccess).toHaveBeenCalledWith('推广链接已复制');

    findButton(host, '打开预览').click();
    expect(window.open).toHaveBeenCalledWith(
      expectedUrl,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('剪贴板不可用时选中只读链接并提示手动复制', async () => {
    writeClipboard.mockRejectedValue(new Error('denied'));
    const { host } = await openActiveProduct();
    findButton(host, '推广链接').click();
    await flushVueUpdates();

    findButton(host, '复制链接').click();
    await flushVueUpdates();

    const input = host.querySelector('input[readonly]') as HTMLInputElement;
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(mocks.messageWarning).toHaveBeenCalledWith('请手动复制推广链接');
  });

  it('丢弃并撤销身份切换前迟到的异步结果', async () => {
    let resolveOldRender: (blob: Blob) => void = () => {};
    const oldRender = new Promise<Blob>((resolve) => {
      resolveOldRender = resolve;
    });
    mocks.renderPromotionAsset
      .mockReturnValueOnce(oldRender)
      .mockResolvedValueOnce(new Blob(['new'], { type: 'image/png' }));
    mocks.getSpu.mockResolvedValue(activeProduct);
    mocks.modalApi.getData.mockReturnValue({ id: 88 });
    const { host } = mountPromotionModal();

    const opening = mocks.modalConfig!.onOpenChange(true);
    await flushVueUpdates();
    findButton(host, '指定推广员').click();
    await flushVueUpdates();
    (host.querySelector('[data-testid="member-27"]') as HTMLElement).click();
    await flushVueUpdates();
    resolveOldRender(new Blob(['old'], { type: 'image/png' }));
    await opening;
    await flushVueUpdates();

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-2');
    expect(host.querySelector('img[src="blob:preview-1"]')).not.toBeNull();
  });
});
