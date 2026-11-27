/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { APP_LINK_TYPE_ENUM } from './data';
import {
  appendLinkParam,
  formatAppLinkName,
  getCategorySelectParentId,
  getGroupLinkIds,
  getLinkDetailName,
  getLinkParamKey,
  resolveAppLinkName,
  validateCategoryLink,
  validateGroupLink,
} from './link-utils';
import SelectDialog from './select-dialog.vue';

const dialogMocks = vi.hoisted(() => ({
  getCategory: vi.fn(),
  getGroups: vi.fn().mockResolvedValue([]),
  messageWarning: vi.fn(),
  modalApis: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    lock: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
    unlock: ReturnType<typeof vi.fn>;
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
      const api = {
        close: vi.fn(),
        lock: vi.fn(),
        open: vi.fn(),
        unlock: vi.fn(),
      };
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

vi.mock('#/api/mall/product/group', () => ({
  getSimpleGroupList: dialogMocks.getGroups,
}));
vi.mock(
  '../diy-editor/components/mobile/product-group/group-select.vue',
  () => ({
    default: {
      emits: ['update:modelValue'],
      template:
        '<button data-test="pick-groups" @click="$emit(\'update:modelValue\', [12, 13])">选择分组</button>',
    },
  }),
);

vi.mock('#/views/mall/product/category/components/', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    ProductCategorySelect: defineComponent({
      emits: ['category-selected'],
      setup(_, { emit }) {
        return () =>
          h('button', {
            'data-test': 'pick-category',
            onClick: () => emit('category-selected', { id: 12, name: '绿茶' }),
          });
      },
    }),
  };
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
  dialogMocks.getGroups.mockReset().mockResolvedValue([]);
  dialogMocks.messageWarning.mockReset();
  dialogMocks.modalApis.length = 0;
  dialogMocks.modalConfigs.length = 0;
});

describe('app link helpers', () => {
  it('keeps old enum values and gives group routes their own encoded parameter', () => {
    expect(APP_LINK_TYPE_ENUM.PRODUCT_LIST).toBe(10);
    expect(APP_LINK_TYPE_ENUM.PRODUCT_GROUP_LIST).toBe(11);
    expect(getLinkParamKey(APP_LINK_TYPE_ENUM.PRODUCT_GROUP_LIST)).toBe(
      'groupIds',
    );
    const path = appendLinkParam(
      '/pages/goods/group-list?label=%E6%96%B0%E8%8C%B6',
      'groupIds',
      '3,5',
    );
    expect(path).toContain('groupIds=3%2C5');
    expect(getGroupLinkIds(path)).toEqual([3, 5]);
    expect(new URL(path, 'https://example.com').searchParams.get('label')).toBe(
      '新茶',
    );
  });

  it.each(['', '0', '1,abc', '-1', '1.2', '9007199254740992'])(
    'rejects unsafe or missing group ids %s',
    async (ids) => {
      expect(
        await validateGroupLink(
          APP_LINK_TYPE_ENUM.PRODUCT_GROUP_LIST,
          `/pages/goods/group-list?groupIds=${ids}`,
          async () => [],
        ),
      ).toBe(false);
    },
  );

  it('requires every linked group to be enabled', async () => {
    const groups = async () => [
      { id: 1, name: '公开', status: 0 },
      { id: 2, name: '内部', status: 0, storefrontVisible: false },
      { id: 3, name: '停用', status: 1, storefrontVisible: true },
    ];
    expect(
      await validateGroupLink(
        APP_LINK_TYPE_ENUM.PRODUCT_GROUP_LIST,
        '/pages/goods/group-index?groupIds=1,2',
        groups,
      ),
    ).toBe(true);
    for (const ids of ['', '3', '99'])
      expect(
        await validateGroupLink(
          APP_LINK_TYPE_ENUM.PRODUCT_GROUP_LIST,
          `/pages/goods/group-list?groupIds=${ids}`,
          groups,
        ),
      ).toBe(false);
  });
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

  async function openLinkDialog(path: string) {
    const change = vi.fn();
    const appLinkChange = vi.fn();
    const dialogRef = ref<{ open: (link: string) => Promise<void> }>();
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(SelectDialog, {
            ref: dialogRef,
            onChange: change,
            onAppLinkChange: appLinkChange,
          });
      },
    });
    dialogHost = document.createElement('div');
    document.body.append(dialogHost);
    const app = createApp(Wrapper);
    unmountDialog = () => app.unmount();
    app.mount(dialogHost);
    await dialogRef.value?.open(path);
    await nextTick();
    return { change, appLinkChange, path };
  }

  function clickOption(label: string) {
    const option = [...dialogHost!.querySelectorAll('div')].find(
      (el) => el.childElementCount === 0 && el.textContent?.trim() === label,
    );
    expect(option).toBeDefined();
    option!.click();
  }

  it.each([
    ['/pages/index/page?id=38', '/pages/index/category'],
    ['/pages/index/category?id=12', '/pages/index/category'],
    ['/pages/index/category?id=12&from=nav', '/pages/index/category?from=nav'],
  ])('selects the category homepage from %s', async (saved, expected) => {
    const { change, appLinkChange } = await openLinkDialog(saved);
    clickOption('商品分类');
    await nextTick();
    clickOption('分类首页');
    await dialogMocks.modalConfigs[0]!.onConfirm();
    expect(change).toHaveBeenCalledExactlyOnceWith(expected);
    expect(appLinkChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: '商品分类', path: expected }),
    );
    expect(dialogMocks.getCategory).not.toHaveBeenCalled();
  });

  it('selects a specific category from the category homepage', async () => {
    dialogMocks.getCategory.mockResolvedValue({ parentId: 0 });
    const { change, appLinkChange } = await openLinkDialog(
      '/pages/index/category',
    );
    clickOption('商品分类');
    await nextTick();
    dialogHost!
      .querySelector<HTMLButtonElement>('[data-test="pick-category"]')!
      .click();
    await dialogMocks.modalConfigs[0]!.onConfirm();
    expect(change).toHaveBeenCalledExactlyOnceWith(
      '/pages/index/category?id=12',
    );
    expect(appLinkChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: '商品分类：绿茶' }),
    );
  });

  async function openGroupDialog(
    status: number,
    path = '/pages/goods/group-list?groupIds=12&campaign=spring%20tea',
  ) {
    dialogMocks.getGroups.mockResolvedValue([
      { id: 12, name: '春茶 & 新品', status, storefrontVisible: false },
      { id: 13, name: '清仓', status: 0 },
    ]);
    const dialog = await openLinkDialog(path);
    await dialogMocks.modalConfigs[0]?.onConfirm();
    return dialog;
  }

  it('roundtrips enabled group labels and the saved link', async () => {
    const { change, appLinkChange, path } = await openGroupDialog(0);
    expect(dialogHost?.textContent).toContain('春茶 & 新品');
    expect(change).toHaveBeenCalledWith(path);
    expect(appLinkChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: '分组商品列表：春茶 & 新品', path }),
    );
  });

  it('requires selecting groups for a saved browse link without group ids', async () => {
    const { change } = await openGroupDialog(0, '/pages/goods/group-index');
    expect(change).not.toHaveBeenCalled();
    expect(dialogMocks.modalApis[1]?.open).toHaveBeenCalledOnce();
  });

  it('saves the selected group ids in a browse link', async () => {
    const { change } = await openGroupDialog(0, '/pages/goods/group-index');
    dialogHost
      ?.querySelector<HTMLButtonElement>('[data-test="pick-groups"]')
      ?.click();
    await dialogMocks.modalConfigs[1]?.onConfirm();
    await dialogMocks.modalConfigs[0]?.onConfirm();

    expect(change).toHaveBeenCalledExactlyOnceWith(
      '/pages/goods/group-index?groupIds=12%2C13',
    );
    expect(dialogMocks.modalApis[1]?.lock).toHaveBeenCalledOnce();
    expect(dialogMocks.modalApis[1]?.unlock).toHaveBeenCalledOnce();
  });

  it('protects unavailable saved group ids from replacement', async () => {
    const { change } = await openGroupDialog(1);
    expect(dialogHost?.textContent).toContain('春茶 & 新品');
    expect(change).not.toHaveBeenCalled();
    expect(dialogHost?.textContent).toContain('已禁用');
    expect(dialogMocks.modalApis[1]?.open).toHaveBeenCalledOnce();
  });
});
