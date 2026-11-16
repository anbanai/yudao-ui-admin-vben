# 商城退款流程与金额显示修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `web-antd` 商城分/元金额显示，并让仅退款审批成功后立即创建支付退款单，同时保留失败重试能力。

**Architecture:** 保留后端现有的同意、退款、支付回调三段式状态机。新增一个纯异步退款编排函数，详情页调用它处理“同意后仅退款自动退款”；退货退款仍沿用原有的人工收货后确认退款路径。所有商城金额列表沿用 VXE 全局 `formatFenToYuanAmount`，只调整错误使用 `formatAmount2` 的列配置。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, VXE Table formatter, Ant Design Vue.

---

### Task 1: Add failing regression tests for refund orchestration

**Files:**
- Create: `apps/web-antd/src/views/mall/trade/afterSale/refund-flow.test.ts`
- Create: `apps/web-antd/src/views/mall/trade/afterSale/refund-flow.ts`

- [ ] **Step 1: Write the failing test**

Create tests for the public helper contract:

```ts
import { describe, expect, it, vi } from 'vitest';

import { agreeAndRefundAfterSale } from './refund-flow';

describe('agreeAndRefundAfterSale', () => {
  it('agrees and then starts refund for refund-only after-sales', async () => {
    const calls: string[] = [];
    const api = {
      agreeAfterSale: vi.fn(async () => calls.push('agree')),
      refundAfterSale: vi.fn(async () => calls.push('refund')),
    };

    await agreeAndRefundAfterSale(1, 10, api);

    expect(calls).toEqual(['agree', 'refund']);
  });

  it('does not start refund when agreement fails', async () => {
    const api = {
      agreeAfterSale: vi.fn(async () => {
        throw new Error('agreement failed');
      }),
      refundAfterSale: vi.fn(),
    };

    await expect(agreeAndRefundAfterSale(1, 10, api)).rejects.toThrow(
      'agreement failed',
    );
    expect(api.refundAfterSale).not.toHaveBeenCalled();
  });

  it('does not auto-refund return-and-refund after-sales', async () => {
    const api = {
      agreeAfterSale: vi.fn(async () => undefined),
      refundAfterSale: vi.fn(),
    };

    await agreeAndRefundAfterSale(1, 20, api);

    expect(api.refundAfterSale).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm exec vitest run apps/web-antd/src/views/mall/trade/afterSale/refund-flow.test.ts`

Expected: FAIL because `refund-flow.ts` does not yet export `agreeAndRefundAfterSale`.

- [ ] **Step 3: Implement the minimal helper**

Export `AFTER_SALE_REFUND_WAY = 10`, an `AfterSaleRefundActions` interface, and `agreeAndRefundAfterSale(id, way, actions)`. Await `actions.agreeAfterSale(id)` first and call `actions.refundAfterSale(id)` only when `way === AFTER_SALE_REFUND_WAY`; allow errors to propagate.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm exec vitest run apps/web-antd/src/views/mall/trade/afterSale/refund-flow.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the helper and tests**

```bash
git add apps/web-antd/src/views/mall/trade/afterSale/refund-flow.ts apps/web-antd/src/views/mall/trade/afterSale/refund-flow.test.ts
git commit -m "test(mall): cover automatic after-sale refund flow"
```

### Task 2: Fix all identified mall amount columns

**Files:**
- Modify: `apps/web-antd/src/views/mall/trade/afterSale/data.ts:126-129`
- Modify: `apps/web-antd/src/views/mall/trade/order/data.ts:212-216`
- Modify: `apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.ts:115-119`
- Modify: `apps/web-antd/src/views/mall/trade/brokerage/withdraw/data.ts:99-110`
- Modify: `apps/web-antd/src/views/mall/promotion/bargain/activity/data.ts:184-195`
- Modify: `apps/web-antd/src/views/mall/promotion/bargain/record/data.ts:74-85,151-155`

- [ ] **Step 1: Add the column-format regression test**

Create `apps/web-antd/src/views/mall/trade/amount-columns.test.ts` with mocked async data APIs where needed, call each affected `useGridColumns()`, and assert every field documented as cents uses `formatter: 'formatFenToYuanAmount'`. Also assert `fenToYuan(1) === '0.01'` and `fenToYuan(100) === '1.00'`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm exec vitest run apps/web-antd/src/views/mall/trade/amount-columns.test.ts`

Expected: FAIL for the current `formatAmount2` columns.

- [ ] **Step 3: Change only the affected formatters**

Replace `formatAmount2` with `formatFenToYuanAmount` in the listed cent-denominated columns. Do not change ERP pages, form input conversion, or columns already using `fenToYuan`/`formatFenToYuanAmount`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm exec vitest run apps/web-antd/src/views/mall/trade/amount-columns.test.ts`

Expected: all column and conversion assertions pass.

- [ ] **Step 5: Commit the amount fixes**

```bash
git add apps/web-antd/src/views/mall/trade/afterSale/data.ts apps/web-antd/src/views/mall/trade/order/data.ts apps/web-antd/src/views/mall/trade/delivery/pickUpOrder/data.ts apps/web-antd/src/views/mall/trade/brokerage/withdraw/data.ts apps/web-antd/src/views/mall/promotion/bargain/activity/data.ts apps/web-antd/src/views/mall/promotion/bargain/record/data.ts apps/web-antd/src/views/mall/trade/amount-columns.test.ts
git commit -m "fix(mall): display cent amounts as yuan"
```

### Task 3: Wire automatic refund and refresh behavior into the detail page

**Files:**
- Modify: `apps/web-antd/src/views/mall/trade/afterSale/detail/index.vue:1-205`
- Modify: `apps/web-antd/src/views/mall/trade/afterSale/detail/index.vue:230-267`

- [ ] **Step 1: Update the agree handler to use the tested helper**

Import `agreeAndRefundAfterSale` and pass the existing API functions as actions. In `handleAgree`, await the helper with `afterSale.value.id!` and `afterSale.value.way`; keep the success toast only after both requests resolve.

- [ ] **Step 2: Refresh details after success and failure**

Ensure `getDetail()` runs in the operation cleanup path after `handleAgree`, `handleRefund`, `handleReceive`, and `handleRefuse`, so a failed refund cannot leave stale status on screen. Preserve thrown request errors for the global request error handler. Do not call refund automatically for way `20`.

- [ ] **Step 3: Make the retry state explicit**

Keep the `afterSale.status === 40` “确认退款” action visible and label it `确认退款/重试退款`, while retaining the existing `refundAfterSale` endpoint. The button must remain available after an approval-success/refund-failure refresh.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/trade/afterSale/refund-flow.test.ts apps/web-antd/src/views/mall/trade/amount-columns.test.ts
pnpm --filter @vben/web-antd typecheck
```

Expected: focused tests pass and the Ant Design app typecheck exits with code 0.

- [ ] **Step 5: Commit the refund UI integration**

```bash
git add apps/web-antd/src/views/mall/trade/afterSale/detail/index.vue
git commit -m "fix(mall): start refund after approving refund-only sale"
```

### Task 4: Full verification

**Files:**
- No additional files.

- [ ] **Step 1: Run the complete relevant unit suite**

Run: `pnpm test:unit`

Expected: Vitest exits 0 with no failed tests.

- [ ] **Step 2: Run formatting and diff checks**

Run: `pnpm lint --filter @vben/web-antd` and `git diff --check`.

Expected: lint and diff checks exit 0.

- [ ] **Step 3: Review the final diff against the spec**

Confirm only `apps/web-antd` runtime code and the approved tests/docs changed; verify amount columns use cent conversion and the refund helper preserves the backend callback-driven success state.
