import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { APP_LINK_TYPE_ENUM } from './data';
import {
  appendLinkParam,
  formatAppLinkName,
  getCategorySelectParentId,
  getLinkDetailName,
  getLinkParamKey,
  resolveAppLinkName,
  validateCategoryLink,
} from './link-utils';
import SelectDialog from './select-dialog.vue';

const dialogMocks = vi.hoisted(() => ({
  getCategory: vi.fn(),
  messageWarning: vi.fn(),
  modalApis: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
  }>,
  modalConfigs: [] as Array<{
    onConfirm: () => Promise<void> | void;
  }>,
}));

vi.mock('@vben/common-ui', async () => {
  const { defineComponent, h } = await import('vue');
  const Modal = defineComponent((_props, { slots }) => {
    return () => h('div', slots.default?.());
  });
  return {
    useVbenModal: (config: { onConfirm: () => Promise<void> | void }) => {
      const api = { close: vi.fn(), open: vi.fn() };
      dialogMocks.modalConfigs.push(config);
      dialogMocks.modalApis.push(api);
      return [Modal, api];
    },
  };
});

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const SlotComponent = defineComponent((_props, { slots }) => {
    return () => h('div', slots.default?.());
  });
  return {
    Button: SlotComponent,
    Form: SlotComponent,
    FormItem: SlotComponent,
    message: { warning: dialogMocks.messageWarning },
    Tooltip: SlotComponent,
  };
});

vi.mock('#/api/mall/product/category', () => ({
  getCategory: dialogMocks.getCategory,
}));

vi.mock('#/views/mall/product/category/components/', async () => {
  const { defineComponent } = await import('vue');
  return { ProductCategorySelect: defineComponent(() => () => null) };
});

vi.mock('./link-detail-select.vue', async () => {
  const { defineComponent } = await import('vue');
  return { default: defineComponent(() => () => null) };
});

let dialogHost: HTMLDivElement | undefined;
let unmountDialog: (() => void) | undefined;

afterEach(() => {
  unmountDialog?.();
  dialogHost?.remove();
  unmountDialog = undefined;
  dialogHost = undefined;
  dialogMocks.getCategory.mockReset();
  dialogMocks.messageWarning.mockReset();
  dialogMocks.modalApis.length = 0;
  dialogMocks.modalConfigs.length = 0;
});

describe('app link helpers', () => {
  it('rejects a persisted child category link before confirmation', async () => {
    expect(
      await validateCategoryLink(
        APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST,
        '/pages/index/category?id=12',
        async () => ({ parentId: 1 }),
      ),
    ).toBe(false);
  });

  it('accepts a persisted root category link before confirmation', async () => {
    expect(
      await validateCategoryLink(
        APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST,
        '/pages/index/category?id=12',
        async () => ({ parentId: 0 }),
      ),
    ).toBe(true);
  });

  it('accepts the generic category page when it has no category id', async () => {
    expect(
      await validateCategoryLink(
        APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST,
        '/pages/index/category',
        async () => ({ parentId: 1 }),
      ),
    ).toBe(true);
  });

  it.each(['0', '-1', '1.5', 'abc'])(
    'rejects malformed category id %s',
    async (id) => {
      expect(
        await validateCategoryLink(
          APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST,
          `/pages/index/category?id=${id}`,
          async () => ({ parentId: 0 }),
        ),
      ).toBe(false);
    },
  );

  it('rejects a category that cannot be verified', async () => {
    expect(
      await validateCategoryLink(
        APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST,
        '/pages/index/category?id=12',
        async () => {
          throw new Error('not found');
        },
      ),
    ).toBe(false);
  });

  it('does not validate unrelated links as categories', async () => {
    expect(
      await validateCategoryLink(
        APP_LINK_TYPE_ENUM.PRODUCT_LIST,
        '/pages/goods/list?categoryId=12',
        async () => {
          throw new Error('should not be called');
        },
      ),
    ).toBe(true);
  });

  it('only offers root categories for the category tab page', () => {
    expect(
      getCategorySelectParentId(APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST),
    ).toBe(0);
    expect(getCategorySelectParentId(APP_LINK_TYPE_ENUM.PRODUCT_LIST)).toBe(
      undefined,
    );
  });

  it('uses the route-specific parameter for category links', () => {
    expect(getLinkParamKey(APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST)).toBe(
      'id',
    );
    expect(getLinkParamKey(APP_LINK_TYPE_ENUM.PRODUCT_LIST)).toBe('categoryId');
  });

  it('uses id for detail links', () => {
    expect(getLinkParamKey(APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_NORMAL)).toBe(
      'id',
    );
  });

  it('appends a selected id without dropping existing query params', () => {
    expect(appendLinkParam('/pages/goods/list?foo=bar', 'categoryId', 12)).toBe(
      '/pages/goods/list?foo=bar&categoryId=12',
    );
  });

  it('includes the selected record name in the display label', () => {
    expect(formatAppLinkName('商品详情', '测试商品')).toBe(
      '商品详情：测试商品',
    );
  });

  it('prefers the concrete product name for promotion records', () => {
    expect(getLinkDetailName({ name: '拼团活动', spuName: '测试商品' })).toBe(
      '测试商品',
    );
  });

  it('preserves an existing detail name when the record is not reselected', () => {
    expect(resolveAppLinkName('商品详情：已有商品')).toBe('商品详情：已有商品');
  });

  it('blocks confirmation of a persisted child category and opens reselection', async () => {
    dialogMocks.getCategory.mockResolvedValue({ parentId: 1 });
    const change = vi.fn();
    const appLinkChange = vi.fn();
    const dialogRef = ref<{ open: (link: string) => Promise<void> }>();
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(SelectDialog, {
            ref: dialogRef,
            onAppLinkChange: appLinkChange,
            onChange: change,
          });
      },
    });
    dialogHost = document.createElement('div');
    document.body.append(dialogHost);
    const app = createApp(Wrapper);
    unmountDialog = () => app.unmount();
    app.mount(dialogHost);

    await dialogRef.value?.open('/pages/index/category?id=12');
    await nextTick();
    await dialogMocks.modalConfigs[0]?.onConfirm();

    expect(dialogMocks.getCategory).toHaveBeenCalledWith(12);
    expect(change).not.toHaveBeenCalled();
    expect(appLinkChange).not.toHaveBeenCalled();
    expect(dialogMocks.modalApis[0]?.close).not.toHaveBeenCalled();
    expect(dialogMocks.messageWarning).toHaveBeenCalledOnce();
    expect(dialogMocks.modalApis[1]?.open).toHaveBeenCalledOnce();
  });
});
