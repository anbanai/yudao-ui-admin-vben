# Order Edit Save Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consistent visible save progress, success, and failure feedback to every editable order-detail modal.

**Architecture:** Add a small order-scoped helper that wraps an async save transaction with Ant Design Vue's persistent loading message, translated success message, and guaranteed loading cleanup. Each modal keeps its existing validation and `modalApi.lock/unlock` lifecycle, while the wrapped transaction includes the API request plus close/refresh emission so success feedback appears only after the save flow completes. Request exceptions are rethrown for the existing global request error interceptor; the WeChat waybill modal adds a specific business-status error toast and inline error state.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Ant Design Vue `message`, Vitest, existing `#` path aliases.

---

### Task 1: Add the failing feedback-helper test

**Files:**
- Create: `apps/web-antd/src/views/mall/trade/order/operation-feedback.test.ts`
- Test target: `apps/web-antd/src/views/mall/trade/order/operation-feedback.ts`

- [ ] **Step 1: Write the failing test**

Mock `ant-design-vue.message` and `#/locales.$t`, then add two tests:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hideLoading = vi.hoisted(() => vi.fn());
const loading = vi.hoisted(() => vi.fn(() => hideLoading));
const success = vi.hoisted(() => vi.fn());
const error = vi.hoisted(() => vi.fn());

vi.mock('ant-design-vue', () => ({
  message: { error, loading, success },
}));

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

describe('withOperationFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading and success feedback and always hides loading', async () => {
    const { withOperationFeedback } = await import('./operation-feedback');

    await expect(withOperationFeedback(async () => 'saved')).resolves.toBe(
      'saved',
    );
    expect(loading).toHaveBeenCalledWith({ content: '保存中...', duration: 0 });
    expect(success).toHaveBeenCalledWith('ui.actionMessage.operationSuccess');
    expect(error).not.toHaveBeenCalled();
    expect(hideLoading).toHaveBeenCalledOnce();
  });

  it('hides loading and preserves a rejection for global error handling', async () => {
    const { withOperationFeedback } = await import('./operation-feedback');
    const failure = new Error('request failed');

    await expect(withOperationFeedback(async () => Promise.reject(failure))).rejects.toBe(
      failure,
    );
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(hideLoading).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/trade/order/operation-feedback.test.ts
```

Expected: FAIL because `./operation-feedback` does not exist yet.

### Task 2: Implement the shared operation-feedback helper

**Files:**
- Create: `apps/web-antd/src/views/mall/trade/order/operation-feedback.ts`

- [ ] **Step 1: Implement the minimal helper**

```ts
import { message } from 'ant-design-vue';

import { $t } from '#/locales';

export async function withOperationFeedback<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const hideLoading = message.loading({ content: '保存中...', duration: 0 });
  try {
    const result = await operation();
    message.success($t('ui.actionMessage.operationSuccess'));
    return result;
  } finally {
    hideLoading();
  }
}
```

- [ ] **Step 2: Run the focused test to verify it passes**

Run:

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/trade/order/operation-feedback.test.ts
```

Expected: PASS with both feedback-state tests green.

### Task 3: Apply the helper to standard order edit modals

**Files:**
- Modify: `apps/web-antd/src/views/mall/trade/order/modules/price-form.vue`
- Modify: `apps/web-antd/src/views/mall/trade/order/modules/remark-form.vue`
- Modify: `apps/web-antd/src/views/mall/trade/order/modules/address-form.vue`
- Modify: `apps/web-antd/src/views/mall/trade/order/modules/delivery-form.vue`

- [ ] **Step 1: Replace direct success-message handling with the wrapped save transaction**

In each file, import `withOperationFeedback` from `../operation-feedback`, remove the direct `message` import, and keep `modalApi.lock()` / `modalApi.unlock()` unchanged. Replace the request/close/emit portion with the corresponding transaction:

```ts
try {
  await withOperationFeedback(async () => {
    await updateOrderPrice({
      id: data.id,
      adjustPrice: data.adjustPrice * 100,
    });
    await modalApi.close();
    emit('success');
  });
} finally {
  modalApi.unlock();
}
```

Use the existing API call and request data for the other three forms; do not alter validation, parameter normalization, or open-state initialization.

- [ ] **Step 2: Run the focused helper test and typecheck the app**

Run:

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/trade/order/operation-feedback.test.ts
pnpm --filter @vben/web-antd typecheck
```

Expected: the focused test passes and Vue/TypeScript reports no new errors.

### Task 4: Apply feedback to the WeChat waybill modal without losing inline errors

**Files:**
- Modify: `apps/web-antd/src/views/mall/trade/order/modules/wechat-delivery-form.vue`

- [ ] **Step 1: Wrap waybill creation and classify business failure**

Import `withOperationFeedback` and Ant Design Vue `message`. Inside the existing locked `try` block, wrap `createWechatWaybill` in the helper. If the API returns a status other than `CREATED`, set the existing `errorMessage`, show that specific error, and throw so the transaction stops; only assign `waybill` and change the confirm button state for a created waybill:

```ts
try {
  await withOperationFeedback(async () => {
    const result = await createWechatWaybill(order.value!.id);
    if (result.status !== 'CREATED') {
      errorMessage.value =
        result.errorMessage || '微信物流订单创建失败，请查看后台错误码后重试';
      message.error(errorMessage.value);
      throw new Error(errorMessage.value);
    }
    waybill.value = result;
    modalApi.setState({ confirmText: '关闭', showCancelButton: false });
    return result;
  });
} catch (error) {
  if (!errorMessage.value) {
    throw error;
  }
}
```

Keep the existing `created` close-only branch and reset behavior untouched.

- [ ] **Step 2: Run focused regression tests and typecheck**

Run:

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/trade/order/operation-feedback.test.ts apps/web-antd/src/views/mall/trade/order/remark-display.test.ts
pnpm --filter @vben/web-antd typecheck
```

Expected: all selected tests pass and typecheck completes successfully.

### Task 5: Run broader verification and inspect the final diff

**Files:**
- Verify: all files listed in Tasks 1-4.

- [ ] **Step 1: Run the workspace unit-test command**

Run:

```bash
pnpm test:unit
```

Expected: Vitest completes without failures. Record any unrelated pre-existing failure separately rather than changing unrelated files.

- [ ] **Step 2: Review formatting and diff scope**

Run:

```bash
git diff --check
git diff -- apps/web-antd/src/views/mall/trade/order docs/superpowers/specs/2026-08-26-order-edit-feedback-design.md docs/superpowers/plans/2026-08-26-order-edit-feedback.md
```

Expected: no whitespace errors; only the helper, its test, and the five order modal integrations are changed beyond the committed design/plan documents.
