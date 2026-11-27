import { createApp, defineComponent, h } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import SfAccounts from './index.vue';

const mocks = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  saveAccount: vi.fn(),
}));

vi.mock('@vben/common-ui', () => ({
  Page: defineComponent(
    (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
  ),
}));

vi.mock('#/api/mall/trade/logistics/sf', () => ({
  getSfAccounts: mocks.getAccounts,
  saveSfAccount: mocks.saveAccount,
}));

let app: ReturnType<typeof createApp>;
let host: HTMLDivElement;

afterEach(() => {
  app.unmount();
  host.remove();
  vi.clearAllMocks();
});

async function mountAccounts(accounts: Record<string, unknown>[]) {
  mocks.getAccounts.mockResolvedValue(accounts);
  mocks.saveAccount.mockResolvedValue(7);
  host = document.createElement('div');
  document.body.append(host);
  app = createApp(SfAccounts);
  app.mount(host);
  await vi.waitFor(() => expect(mocks.getAccounts).toHaveBeenCalledOnce());
}

function button(label: string) {
  const match = [...host.querySelectorAll('button')].find(
    (item) => item.textContent?.replaceAll(/\s+/g, '') === label,
  );
  expect(match).toBeDefined();
  return match!;
}

it('submits only account settings and preserves masked credentials on edit', async () => {
  await mountAccounts([
    {
      id: 7,
      name: '平台顺丰',
      partnerIdMasked: '****1234',
      senderName: '旧发件人',
      status: 0,
      defaultFlag: true,
    },
  ]);

  await vi.waitFor(() => expect(host.textContent).toContain('平台顺丰'));
  button('编辑').click();
  await vi.waitFor(() =>
    expect(host.querySelector('input')?.value).toBe('平台顺丰'),
  );
  button('保存').click();

  await vi.waitFor(() =>
    expect(mocks.saveAccount).toHaveBeenCalledWith({
      id: 7,
      name: '平台顺丰',
      partnerId: undefined,
      checkWord: undefined,
      defaultFlag: true,
      status: 0,
    }),
  );
});

it('reports when the only default account is disabled', async () => {
  await mountAccounts([
    { id: 7, name: '平台顺丰', status: 1, defaultFlag: true },
  ]);

  await vi.waitFor(() =>
    expect(host.textContent).toContain('请启用并设置一个默认账号'),
  );
});
