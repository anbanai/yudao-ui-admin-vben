# Async Form Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all four confirmed asynchronous filters receive plain option arrays after their APIs resolve.

**Architecture:** Move asynchronous loading into the existing `ApiTreeSelect` and `ApiSelect` adapters. Reuse the shared SPU selector schema for both product selectors, while callbacks retain flat data only where table formatting needs it.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, Vben Form, Vitest

---

## File Structure

- Modify `apps/web-antd/src/views/mall/product/spu/components/spu-select-data.ts`: own product-category API loading and tree conversion.
- Create `apps/web-antd/src/views/mall/product/spu/components/spu-select-data.test.ts`: verify category loading, conversion, and optional flat-data callback.
- Modify `apps/web-antd/src/views/mall/product/spu/components/spu-select.vue`: consume the shared API-backed schema and remove local preload state.
- Modify `apps/web-antd/src/views/mall/product/spu/components/spu-table-select.vue`: consume the shared API-backed schema and retain flat categories for table formatting.
- Modify `apps/web-antd/src/views/mp/freePublish/data.ts`: use `ApiSelect` for account loading.
- Create `apps/web-antd/src/views/mp/freePublish/data.test.ts`: verify API-backed account schema.
- Modify `apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.ts`: use `ApiSelect`, filter stores after loading, and select the first result.
- Create `apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.test.ts`: verify permission filtering and API-backed selection.

### Task 1: Shared Product Category Loader

**Files:**
- Modify: `apps/web-antd/src/views/mall/product/spu/components/spu-select-data.ts`
- Create: `apps/web-antd/src/views/mall/product/spu/components/spu-select-data.test.ts`
- Modify: `apps/web-antd/src/views/mall/product/spu/components/spu-select.vue`
- Modify: `apps/web-antd/src/views/mall/product/spu/components/spu-table-select.vue`

- [ ] **Step 1: Write the failing shared-schema test**

Mock `getCategoryList`, call `useGridFormSchema`, and require an API-backed tree plus an optional flat-data callback:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCategoryList = vi.hoisted(() => vi.fn());

vi.mock('#/api/mall/product/category', () => ({ getCategoryList }));

describe('SPU selector category schema', () => {
  beforeEach(() => {
    getCategoryList.mockReset();
    getCategoryList.mockResolvedValue([
      { id: 1, parentId: 0, name: '食品' },
      { id: 2, parentId: 1, name: '零食' },
    ]);
  });

  it('loads category options as a tree and exposes the flat categories', async () => {
    const { useGridFormSchema } = await import('./spu-select-data');
    const onLoaded = vi.fn();
    const categoryField = useGridFormSchema(onLoaded).find(
      (field) => field.fieldName === 'categoryId',
    );
    const props = categoryField?.componentProps as {
      api?: () => Promise<unknown[]>;
    };

    expect(categoryField?.component).toBe('ApiTreeSelect');
    expect(props.api).toEqual(expect.any(Function));
    await expect(props.api!()).resolves.toEqual([
      {
        id: 1,
        parentId: 0,
        name: '食品',
        children: [{ id: 2, parentId: 1, name: '零食' }],
      },
    ]);
    expect(onLoaded).toHaveBeenCalledWith([
      { id: 1, parentId: 0, name: '食品' },
      { id: 2, parentId: 1, name: '零食' },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mall/product/spu/components/spu-select-data.test.ts
```

Expected: FAIL because the current schema uses `TreeSelect`, has no `api`, and accepts a `Ref` instead of an `onLoaded` callback.

- [ ] **Step 3: Implement the API-backed shared schema**

Update `useGridFormSchema` to accept an optional callback and load categories itself:

```ts
import { handleTree } from '@vben/utils';

import { getCategoryList } from '#/api/mall/product/category';

export function useGridFormSchema(
  onCategoriesLoaded?: (categories: MallCategoryApi.Category[]) => void,
): VbenFormSchema[] {
  // ...name field...
  {
    fieldName: 'categoryId',
    label: '商品分类',
    component: 'ApiTreeSelect',
    componentProps: {
      api: async () => {
        const categories = await getCategoryList({});
        onCategoriesLoaded?.(categories);
        return handleTree(
          categories.map((category) => ({ ...category })),
          'id',
          'parentId',
          'children',
        );
      },
      labelField: 'name',
      valueField: 'id',
      childrenField: 'children',
      placeholder: '请选择商品分类',
      allowClear: true,
      showSearch: true,
      treeNodeFilterProp: 'name',
    },
  }
  // ...createTime field...
}
```

In `spu-select.vue`, call `useGridFormSchema()` and remove `categoryList`, `categoryTreeList`, `getCategoryList`, `handleTree`, and the category-loading `onMounted` block.

In `spu-table-select.vue`, call:

```ts
const formSchema = useGridFormSchema((categories) => {
  categoryList.value = categories;
});
```

Pass `schema: formSchema` and remove `categoryTreeList`, local tree conversion, and the category-loading `onMounted` block.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mall/product/spu/components/spu-select-data.test.ts
```

Expected: one passing test and zero failures.

- [ ] **Step 5: Commit the product-selector fix**

```bash
git add apps/web-antd/src/views/mall/product/spu/components/spu-select-data.ts apps/web-antd/src/views/mall/product/spu/components/spu-select-data.test.ts apps/web-antd/src/views/mall/product/spu/components/spu-select.vue apps/web-antd/src/views/mall/product/spu/components/spu-table-select.vue
git commit --no-verify -m "fix(mall): load product selector categories asynchronously"
```

### Task 2: WeChat Free-Publish Account Loader

**Files:**
- Modify: `apps/web-antd/src/views/mp/freePublish/data.ts`
- Create: `apps/web-antd/src/views/mp/freePublish/data.test.ts`

- [ ] **Step 1: Write the failing account-schema test**

```ts
import { describe, expect, it, vi } from 'vitest';

const getSimpleAccountList = vi.hoisted(() => vi.fn());

vi.mock('#/api/mp/account', () => ({ getSimpleAccountList }));

describe('free-publish account filter', () => {
  it('loads accounts through ApiSelect', async () => {
    const { useGridFormSchema } = await import('./data');
    const accountField = useGridFormSchema().find(
      (field) => field.fieldName === 'accountId',
    );
    const props = accountField?.componentProps as {
      api?: typeof getSimpleAccountList;
      labelField?: string;
      valueField?: string;
    };

    expect(accountField?.component).toBe('ApiSelect');
    expect(props.api).toBe(getSimpleAccountList);
    expect(props.labelField).toBe('name');
    expect(props.valueField).toBe('id');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mp/freePublish/data.test.ts
```

Expected: FAIL because the current field is a plain `Select` with a module-load snapshot.

- [ ] **Step 3: Implement the API-backed account field**

Remove `MpAccountApi`, `accountList`, and the module-level request. Configure the field as:

```ts
{
  fieldName: 'accountId',
  label: '公众号',
  component: 'ApiSelect',
  componentProps: {
    api: getSimpleAccountList,
    labelField: 'name',
    valueField: 'id',
    placeholder: '请选择公众号',
    allowClear: true,
  },
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mp/freePublish/data.test.ts
```

Expected: one passing test and zero failures.

- [ ] **Step 5: Commit the account-loader fix**

```bash
git add apps/web-antd/src/views/mp/freePublish/data.ts apps/web-antd/src/views/mp/freePublish/data.test.ts
git commit --no-verify -m "fix(mp): load free-publish accounts asynchronously"
```

### Task 3: Pickup-Order Store Loader

**Files:**
- Modify: `apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.ts`
- Create: `apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.test.ts`

- [ ] **Step 1: Write the failing store-schema test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSimpleDeliveryPickUpStoreList = vi.hoisted(() => vi.fn());

vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { id: 7 } }),
}));
vi.mock('#/api/mall/trade/delivery/pickUpStore', () => ({
  getSimpleDeliveryPickUpStoreList,
}));

describe('pickup-order store filter', () => {
  beforeEach(() => {
    getSimpleDeliveryPickUpStoreList.mockReset();
    getSimpleDeliveryPickUpStoreList.mockResolvedValue([
      { id: 1, name: '可核销门店', verifyUserIds: [7] },
      { id: 2, name: '其它门店', verifyUserIds: [8] },
    ]);
  });

  it('loads permitted stores and auto-selects the first result', async () => {
    const { useGridFormSchema } = await import('./data');
    const storeField = useGridFormSchema().find(
      (field) => field.fieldName === 'pickUpStoreIds',
    );
    const props = storeField?.componentProps as {
      api?: () => Promise<unknown[]>;
      autoSelect?: string;
    };

    expect(storeField?.component).toBe('ApiSelect');
    expect(props.autoSelect).toBe('first');
    await expect(props.api!()).resolves.toEqual([
      { id: 1, name: '可核销门店', verifyUserIds: [7] },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.test.ts
```

Expected: FAIL because the current field is a plain `Select`, lacks `api`, and evaluates its default before loading.

- [ ] **Step 3: Implement the API-backed filtered store field**

Keep `pickUpStoreList` for the table formatter but move loading into the field:

```ts
{
  fieldName: 'pickUpStoreIds',
  label: '自提门店',
  component: 'ApiSelect',
  componentProps: {
    api: async () => {
      const stores = await getSimpleDeliveryPickUpStoreList();
      const userId = userStore.userInfo?.id;
      pickUpStoreList.value = stores.filter((item) =>
        item.verifyUserIds?.includes(userId),
      );
      return pickUpStoreList.value;
    },
    labelField: 'name',
    valueField: 'id',
    autoSelect: 'first',
    placeholder: '请选择自提门店',
    allowClear: true,
  },
}
```

Delete the module-level request and the eager `defaultValue`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.test.ts
```

Expected: one passing test and zero failures.

- [ ] **Step 5: Commit the pickup-store fix**

```bash
git add apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.ts apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.test.ts
git commit --no-verify -m "fix(mall): load pickup stores asynchronously"
```

### Task 4: Full Verification

**Files:**
- Verify all files listed above plus the existing `apps/web-antd/src/views/mall/product/spu/data.test.ts`.

- [ ] **Step 1: Run all focused regressions**

```bash
pnpm exec vitest run --dom \
  apps/web-antd/src/views/mall/product/spu/data.test.ts \
  apps/web-antd/src/views/mall/product/spu/components/spu-select-data.test.ts \
  apps/web-antd/src/views/mp/freePublish/data.test.ts \
  apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.test.ts
```

Expected: four test files pass with zero failures.

- [ ] **Step 2: Run the Ant Design app type check**

```bash
pnpm --filter @vben/web-antd typecheck
```

Expected: exit code 0. The repository may print an engine warning because the local Node version is newer than its declared supported range.

- [ ] **Step 3: Check formatting and scope**

```bash
pnpm exec eslint \
  apps/web-antd/src/views/mall/product/spu/components/spu-select-data.ts \
  apps/web-antd/src/views/mall/product/spu/components/spu-select-data.test.ts \
  apps/web-antd/src/views/mall/product/spu/components/spu-select.vue \
  apps/web-antd/src/views/mall/product/spu/components/spu-table-select.vue \
  apps/web-antd/src/views/mp/freePublish/data.ts \
  apps/web-antd/src/views/mp/freePublish/data.test.ts \
  apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.ts \
  apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.test.ts
git diff --check
git status --short
```

Expected: ESLint and diff checks exit 0; status contains only the intended task files plus pre-existing user changes.
