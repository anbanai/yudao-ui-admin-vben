import { createApp, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import Confirmation from '../send-confirmation.vue';
import { createCouponSendSession } from '../send-session';
const batch = {
  id: 21,
  templateId: 4,
  status: 0,
  totalCount: 1,
  successCount: 0,
  failureCount: 0,
  userSnapshot: '19',
  mobileSnapshot: '13800000000',
  failureDetails: '',
  templateSnapshot: JSON.stringify({
    name: '测试模板',
    validityType: 2,
    fixedStartTerm: 0,
    fixedEndTerm: 7,
    usePrice: 1000,
    couponType: 1,
    discountType: 1,
    discountPrice: 500,
    productScope: 2,
    productScopeValues: [71, 72],
    totalCount: 100,
    takeLimitCount: 1,
    canStack: false,
  }),
};
let unmount = () => {};
afterEach(() => {
  unmount();
  document.body.innerHTML = '';
});
async function mountBatch(result = batch, restorePending = false) {
  let submitted = 0;
  let discarded = 0;
  const values = new Map<string, string>(
    restorePending
      ? [['marketing-coupon-pending-batch', String(result.id)]]
      : [],
  );
  const session = createCouponSendSession(
    {
      cancel: async () => {
        discarded++;
        return { ...result, status: 3, failureDetails: 'CANCELED_BY_OPERATOR' };
      },
      preview: async () => ({ ...result }),
      submit: async () => {
        submitted++;
        return { ...result, status: 1, successCount: 1 };
      },
      read: async () => ({ ...result }),
    },
    {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    },
  );
  await (restorePending
    ? session.restore()
    : session.preview({ templateId: 4, userIds: [19] }));
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () =>
      session.state.batch
        ? h(Confirmation, {
            batch: session.state.batch,
            busy: session.state.busy,
            uncertain: session.state.uncertain,
            onConfirm: () => session.confirm(),
            onCancel: () => session.cancel(),
            onDiscard: () => session.discard(),
          })
        : h('p', '已取消'),
  });
  app.directive('access', {});
  app.mount(host);
  unmount = () => app.unmount();
  await nextTick();
  return {
    host,
    session,
    submitted: () => submitted,
    discarded: () => discarded,
  };
}
describe('confirmation UI', () => {
  it('offers safe discard for a pending unknown result, then allows closing without issuance', async () => {
    const ui = await mountBatch(batch, true);
    expect(
      ui.host.querySelector<HTMLButtonElement>('[data-testid="cancel"]')!
        .disabled,
    ).toBe(true);
    ui.host
      .querySelector<HTMLButtonElement>('[data-testid="discard"]')!
      .click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(ui.discarded()).toBe(1);
    expect(ui.submitted()).toBe(0);
    expect(ui.host.textContent).toContain('批次已作废');
    expect(ui.host.querySelector('[data-testid="discard"]')).toBeNull();
    const close = ui.host.querySelector<HTMLButtonElement>(
      '[data-testid="cancel"]',
    )!;
    expect(close.disabled).toBe(false);
    close.click();
    await nextTick();
    expect(ui.host.textContent).toBe('已取消');
  });
  it.each([
    [2, '批次发放失败', '模板已变更，请重新预检确认'],
    [3, '批次已作废', 'CANCELED_BY_OPERATOR'],
  ] as const)(
    'can close restored terminal status %s and preview again',
    async (status, label, failureDetails) => {
      const ui = await mountBatch({ ...batch, status, failureDetails }, true);
      expect(ui.host.textContent).toContain(label);
      expect(ui.host.textContent).toContain(failureDetails);
      expect(ui.host.querySelector('[data-testid="confirm"]')).toBeNull();
      const close = ui.host.querySelector<HTMLButtonElement>(
        '[data-testid="cancel"]',
      )!;
      expect(close.disabled).toBe(false);
      close.click();
      await nextTick();
      expect(ui.host.textContent).toBe('已取消');
      await ui.session.preview({ templateId: 4, userIds: [19] });
      expect(ui.session.state.batch?.id).toBe(21);
      expect(ui.submitted()).toBe(0);
    },
  );
  it('shows server validity, counts and restrictions; cancel button never issues coupons', async () => {
    const ui = await mountBatch();
    expect(ui.host.textContent).toContain('测试模板');
    expect(ui.host.textContent).toContain('第 0 天至第 7 天有效');
    expect(ui.host.textContent).toContain('使用门槛 10.00 元');
    expect(ui.host.textContent).toContain('19');
    expect(ui.host.textContent).toContain('优惠面额：5.00 元');
    expect(ui.host.textContent).toContain('指定商品SPU 71，72');
    ui.host.querySelector<HTMLButtonElement>('[data-testid="cancel"]')!.click();
    await nextTick();
    expect(ui.submitted()).toBe(0);
    expect(ui.host.textContent).toBe('已取消');
  });
  it('confirm button sends exactly once and displays the result', async () => {
    const ui = await mountBatch();
    ui.host
      .querySelector<HTMLButtonElement>('[data-testid="confirm"]')!
      .click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(ui.submitted()).toBe(1);
    expect(ui.host.textContent).toContain('已发放 1 人');
    expect(ui.host.querySelector('[data-testid="confirm"]')).toBeNull();
  });
  it('disables issuance on backend preview failures and shows actual details', async () => {
    const ui = await mountBatch({
      ...batch,
      failureCount: 1,
      failureDetails: 'TAKE_LIMIT_REACHED:19',
    });
    const confirm = ui.host.querySelector<HTMLButtonElement>(
      '[data-testid="confirm"]',
    )!;
    expect(confirm.disabled).toBe(true);
    confirm.click();
    await nextTick();
    expect(ui.submitted()).toBe(0);
    expect(ui.host.textContent).toContain('TAKE_LIMIT_REACHED:19');
  });
});
