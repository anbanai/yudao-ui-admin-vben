# 订单列表备注展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `web-antd` 交易订单列表的订单行下展示非空的商家备注和用户备注，空备注不占用列表空间。

**Architecture:** 新增一个只负责把订单备注字段转换为展示项的纯函数，集中处理首尾空白判断并保留原始文本。订单列表的现有展开行插槽复用该函数，在商品明细下追加备注区域，不新增表格列、接口或其他 UI 应用改动。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vxe Table slots, Ant Design Vue, Vitest, pnpm.

---

### Task 1: Add the tested order remark display helper

**Files:**
- Create: `apps/web-antd/src/views/mall/trade/order/remark-display.ts`
- Test: `apps/web-antd/src/views/mall/trade/order/remark-display.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `remark-display.test.ts` with the public behavior contract:

```ts
import { describe, expect, it } from 'vitest';

import { getOrderRemarkItems } from './remark-display';

describe('getOrderRemarkItems', () => {
  it('returns both labeled remarks and preserves their original content', () => {
    expect(
      getOrderRemarkItems({
        remark: '请尽快发货',
        userRemark: '工作日配送',
      }),
    ).toEqual([
      { key: 'merchant', label: '商家备注', content: '请尽快发货' },
      { key: 'user', label: '用户备注', content: '工作日配送' },
    ]);
  });

  it('returns only the non-empty remark', () => {
    expect(getOrderRemarkItems({ remark: '仅商家备注', userRemark: '  ' })).toEqual([
      { key: 'merchant', label: '商家备注', content: '仅商家备注' },
    ]);
    expect(getOrderRemarkItems({ remark: '', userRemark: '仅用户备注' })).toEqual([
      { key: 'user', label: '用户备注', content: '仅用户备注' },
    ]);
  });

  it('returns no items when both remarks are empty or whitespace', () => {
    expect(getOrderRemarkItems({ remark: undefined, userRemark: ' \n ' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mall/trade/order/remark-display.test.ts
```

Expected: FAIL because `remark-display.ts` does not yet export `getOrderRemarkItems`.

- [ ] **Step 3: Implement the minimal helper**

Create `remark-display.ts` with this contract:

```ts
export interface OrderRemarkItem {
  key: 'merchant' | 'user';
  label: '商家备注' | '用户备注';
  content: string;
}

interface OrderRemarks {
  remark?: string;
  userRemark?: string;
}

type OrderRemarkCandidate = Omit<OrderRemarkItem, 'content'> & {
  content?: string;
};

export function getOrderRemarkItems({
  remark,
  userRemark,
}: OrderRemarks): OrderRemarkItem[] {
  const items: OrderRemarkCandidate[] = [
    { key: 'merchant', label: '商家备注', content: remark },
    { key: 'user', label: '用户备注', content: userRemark },
  ];

  return items.filter(
    (item): item is OrderRemarkItem =>
      typeof item.content === 'string' && item.content.trim().length > 0,
  );
}
```

The function must use trimmed content only for the empty check; it must return the original content so meaningful leading/trailing spaces are not silently changed in the UI.

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same Vitest command. Expected: 3 tests pass with no failures.

- [ ] **Step 5: Commit the helper and regression test**

```bash
git add apps/web-antd/src/views/mall/trade/order/remark-display.ts apps/web-antd/src/views/mall/trade/order/remark-display.test.ts
git commit -m "test(mall): cover order list remark display data"
```

### Task 2: Render non-empty remarks in the order row

**Files:**
- Modify: `apps/web-antd/src/views/mall/trade/order/index.vue:1-7,92-119`

- [ ] **Step 1: Import the tested helper**

Add this import beside the existing local order modules:

```ts
import { getOrderRemarkItems } from './remark-display';
```

- [ ] **Step 2: Add the conditional remarks band below the item list**

Inside `#expand_content`, immediately after the existing `</List>`, add:

```vue
        <div
          v-if="getOrderRemarkItems(row).length > 0"
          class="mt-2 space-y-1 border-t border-solid border-red-100 bg-red-50 px-3 py-2 text-sm text-red-500"
        >
          <div
            v-for="remark in getOrderRemarkItems(row)"
            :key="remark.key"
            class="break-words leading-6"
          >
            <span class="font-medium">{{ remark.label }}：</span>
            {{ remark.content }}
          </div>
        </div>
```

This keeps the two labels separate, wraps long content, and omits both the individual empty rows and the entire remarks band when neither field has content. Do not add a new grid column or modify the existing remark edit action.

- [ ] **Step 3: Run the focused helper test after wiring the template**

Run:

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mall/trade/order/remark-display.test.ts
```

Expected: all 3 tests pass; the template only consumes the already-tested helper.

- [ ] **Step 4: Run Ant Design type checking**

Run:

```bash
pnpm --filter @vben/web-antd typecheck
```

Expected: `vue-tsc --noEmit --skipLibCheck` completes successfully without errors from the changed order files.

- [ ] **Step 5: Review the scoped diff and commit the UI change**

```bash
git diff --check -- apps/web-antd/src/views/mall/trade/order/index.vue apps/web-antd/src/views/mall/trade/order/remark-display.ts apps/web-antd/src/views/mall/trade/order/remark-display.test.ts
git diff -- apps/web-antd/src/views/mall/trade/order/index.vue apps/web-antd/src/views/mall/trade/order/remark-display.ts apps/web-antd/src/views/mall/trade/order/remark-display.test.ts
git add apps/web-antd/src/views/mall/trade/order/index.vue
git commit -m "feat(mall): show order remarks in list rows"
```

Expected: the diff only adds the helper import and conditional remarks band to the Ant Design order list; existing filters, columns, expansion, and actions remain unchanged.

### Task 3: Final verification

**Files:**
- Verify: `apps/web-antd/src/views/mall/trade/order/index.vue`
- Verify: `apps/web-antd/src/views/mall/trade/order/remark-display.ts`
- Verify: `apps/web-antd/src/views/mall/trade/order/remark-display.test.ts`

- [ ] **Step 1: Run the focused test and typecheck together**

```bash
pnpm exec vitest run --dom apps/web-antd/src/views/mall/trade/order/remark-display.test.ts && pnpm --filter @vben/web-antd typecheck
```

Expected: the focused test passes and the application typecheck exits with status 0.

- [ ] **Step 2: Verify the repository status**

```bash
git status --short
```

Expected: only pre-existing user changes plus the two implementation commits are present; no generated `dist`, coverage, or `.turbo` output is added.
