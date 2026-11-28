import type { Slots } from 'vue';

import { createApp, h } from 'vue';

import { Modal } from 'ant-design-vue';
import { expect, it, vi } from 'vitest';

import {
  assignMemberBatch,
  confirmYouzanCustomerImport,
  getAuthorizedYouzanMemberMerchants,
  previewYouzanCustomerImport,
} from '#/api/member/youzan-import';

import MemberImport from './index.vue';

vi.mock('@vben/access', () => ({
  useAccess: () => ({ hasAccessByCodes: () => true }),
}));
vi.mock('@vben/common-ui', () => ({
  Page: (_: unknown, { slots }: { slots: Slots }) =>
    h('main', slots.default?.()),
}));
vi.mock('#/api/member/youzan-import', () => ({
  assignMemberBatch: vi.fn(),
  confirmYouzanCustomerImport: vi.fn(),
  getAuthorizedYouzanMemberMerchants: vi.fn(),
  listPendingMemberBatches: vi.fn(),
  previewYouzanCustomerImport: vi.fn(),
}));

it('shows the points and membership level for each preview row after a file is chosen', async () => {
  vi.mocked(getAuthorizedYouzanMemberMerchants).mockResolvedValue(['1']);
  const preview = {
    batchId: 12,
    expiresAt: 1_795_876_766_319,
    validCount: 2,
    invalidCount: 0,
    rows: [
      {
        rowNumber: 2,
        maskedMobile: '138****0001',
        legacyPoints: 0,
        levelName: '黄金会员',
        outcome: '待导入快照',
      },
      {
        rowNumber: 3,
        maskedMobile: '138****0002',
        legacyPoints: 150,
        levelName: null,
        outcome: '待导入快照',
      },
    ],
  };
  vi.mocked(previewYouzanCustomerImport).mockResolvedValue(preview);
  const pending = {
    ...preview,
    status: 3,
    totalRows: 2,
    validRows: 2,
    invalidRows: 0,
  };
  vi.mocked(confirmYouzanCustomerImport).mockResolvedValue(pending);
  vi.mocked(assignMemberBatch).mockResolvedValue({
    ...pending,
    status: 1,
    importedRows: 2,
    merchantId: '1',
  });
  const button = (label: string) =>
    [...document.querySelectorAll('button')].find(
      (el) => el.textContent?.trim() === label,
    )!;
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(MemberImport);
  try {
    app.mount(host);
    const file = new File(['fixture'], '客户.xlsx');
    const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const submit = [...host.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === '上传并预览',
    )!;
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    submit.click();
    await vi.waitFor(() =>
      expect(host.querySelectorAll('tr.ant-table-row')).toHaveLength(2),
    );
    expect(getAuthorizedYouzanMemberMerchants).not.toHaveBeenCalled();
    expect(previewYouzanCustomerImport).toHaveBeenCalledWith(file);
    const rows = [...host.querySelectorAll('tr.ant-table-row')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ['2', '138****0001', '0', '黄金会员', '待导入快照'],
      ['3', '138****0002', '150', '—', '待导入快照'],
    ]);
    expect(host.textContent).not.toContain('1795876766319');

    button('确认导入').click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('.ant-modal-confirm .ant-btn-primary'),
      ).toBeTruthy(),
    );
    document
      .querySelector<HTMLButtonElement>('.ant-modal-confirm .ant-btn-primary')!
      .click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain('已导入，待分配会员来源'),
    );
    expect(confirmYouzanCustomerImport).toHaveBeenCalledWith(12);
    expect(button('确认分配').disabled).toBe(true);
    const assignment = button('确认分配').parentElement!;
    await vi.waitFor(() =>
      expect(assignment.querySelector('.ant-select-disabled')).toBeNull(),
    );
    assignment
      .querySelector('.ant-select-selector')!
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await vi.waitFor(() =>
      expect(document.querySelector('.ant-select-item-option')).toBeTruthy(),
    );
    document.querySelector<HTMLElement>('.ant-select-item-option')!.click();
    await vi.waitFor(() => expect(button('确认分配').disabled).toBe(false));
    button('确认分配').click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain('会员资产已导入，等待领取'),
    );
    expect(assignMemberBatch).toHaveBeenCalledWith(12, '1');
  } finally {
    Modal.destroyAll();
    app.unmount();
    host.remove();
  }
});
