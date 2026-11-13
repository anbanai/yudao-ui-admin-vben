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
async function mountBatch(result = batch) {
  let submitted = 0;
  const session = createCouponSendSession({
    preview: async () => ({ ...result }),
    submit: async () => {
      submitted++;
      return { ...result, status: 1, successCount: 1 };
    },
    read: async () => ({ ...result }),
  });
  await session.preview({ templateId: 4, userIds: [19] });
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
          })
        : h('p', '已取消'),
  });
  app.directive('access', {});
  app.mount(host);
  unmount = () => app.unmount();
  await nextTick();
  return { host, submitted: () => submitted };
}
describe('confirmation UI', () => {
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
