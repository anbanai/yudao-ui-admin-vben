import { createApp, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PromotionMemberSelect from './promotion-member-select.vue';

const apiMocks = vi.hoisted(() => ({ getUserPage: vi.fn() }));
vi.mock('#/api/member/user', () => ({ getUserPage: apiMocks.getUserPage }));

describe('promotion member select', () => {
  const mountedApps: Array<ReturnType<typeof createApp>> = [];

  function mountMemberSelect(props: Record<string, unknown> = {}) {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(PromotionMemberSelect, props);
    mountedApps.push(app);
    const vm = app.mount(host) as unknown as {
      handleChange: (value: number | undefined) => void;
      options: Array<{ label: string; value: number }>;
      search: (keyword: string) => void;
    };
    return { app, host, vm };
  }

  beforeEach(() => {
    apiMocks.getUserPage.mockReset();
  });

  afterEach(() => {
    for (const app of mountedApps) app.unmount();
    mountedApps.length = 0;
    document.body.innerHTML = '';
  });

  it('搜索昵称并展示手机号末四位', async () => {
    apiMocks.getUserPage.mockResolvedValue({
      list: [{ id: 9, mobile: '13800001234', nickname: '茶友' }],
      total: 1,
    });
    const { app, host, vm } = mountMemberSelect();
    vm.search('茶友');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await nextTick();
    expect(apiMocks.getUserPage).toHaveBeenCalledWith({
      nickname: '茶友',
      pageNo: 1,
      pageSize: 20,
    });
    expect(vm.options[0]?.label).toContain('茶友');
    expect(vm.options[0]?.label).toContain('1234');
    expect(host.textContent).toContain('搜索会员昵称或手机号');
    app.unmount();
  });

  it('数字关键词按手机号搜索', async () => {
    apiMocks.getUserPage.mockResolvedValue({ list: [], total: 0 });
    const { vm } = mountMemberSelect();
    vm.search(' 1380000 ');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(apiMocks.getUserPage).toHaveBeenCalledWith({
      mobile: '1380000',
      pageNo: 1,
      pageSize: 20,
    });
  });

  it('无手机号时不显示手机号尾号占位符', async () => {
    apiMocks.getUserPage.mockResolvedValue({
      list: [{ id: 10, nickname: '无手机号会员' }],
      total: 1,
    });
    const { vm } = mountMemberSelect();
    vm.search('无手机号会员');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await nextTick();
    expect(vm.options[0]?.label).not.toContain('手机尾号');
    expect(vm.options[0]?.label).not.toContain('----');
  });

  it('较早的响应不会覆盖较新的搜索结果', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    apiMocks.getUserPage.mockReturnValueOnce(first).mockResolvedValueOnce({
      list: [{ id: 2, nickname: '新结果', mobile: '13900005678' }],
      total: 1,
    });
    const { vm } = mountMemberSelect();
    vm.search('旧');
    await new Promise((resolve) => setTimeout(resolve, 350));
    vm.search('新');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await nextTick();
    expect(vm.options[0]?.label).toContain('新结果');
    resolveFirst({
      list: [{ id: 1, nickname: '旧结果', mobile: '13800001234' }],
      total: 1,
    });
    await nextTick();
    expect(vm.options[0]?.label).toContain('新结果');
  });

  it('选择和清空时发出完整会员信息', async () => {
    const member = { id: 9, mobile: '13800001234', nickname: '茶友' };
    apiMocks.getUserPage.mockResolvedValue({ list: [member], total: 1 });
    const changes: unknown[] = [];
    const { vm } = mountMemberSelect({
      onChange: (value: unknown) => changes.push(value),
    });
    vm.search('茶友');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await nextTick();
    vm.handleChange(9);
    vm.handleChange(undefined);
    expect(changes).toEqual([member, undefined]);
  });
});
