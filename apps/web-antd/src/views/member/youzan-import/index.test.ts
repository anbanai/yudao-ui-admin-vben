import type { Slots } from 'vue';

import { createApp, h } from 'vue';

import { Modal } from 'ant-design-vue';
import { expect, it, vi } from 'vitest';

import {
  confirmYouzanCustomerImport,
  getYouzanCustomerImportResult,
  previewYouzanCustomerImport,
} from '#/api/member/youzan-import';

import MemberImport from './index.vue';

vi.mock('@vben/access', () => ({
  useAccess: () => ({ hasAccessByCodes: () => true }),
}));
vi.mock('@vben/common-ui', () => ({
  Page: (_: unknown, { slots }: { slots: Slots }) =>
    h('main', [slots.extra?.(), slots.default?.()]),
}));
vi.mock('#/api/member/youzan-import', () => ({
  confirmYouzanCustomerImport: vi.fn(),
  getYouzanCustomerImportResult: vi.fn(),
  previewYouzanCustomerImport: vi.fn(),
}));

it('shows the points and membership level for each preview row after a file is chosen', async () => {
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
  vi.mocked(confirmYouzanCustomerImport).mockResolvedValue({
    ...preview,
    status: 1,
    importedRows: 2,
    merchantId: null,
    totalRows: 2,
    validRows: 2,
    invalidRows: 0,
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
      expect(host.textContent).toContain(
        '会员积分和等级已导入，可凭手机号领取',
      ),
    );
    expect(confirmYouzanCustomerImport).toHaveBeenCalledWith(12);
    expect(host.querySelector('.ant-select')).toBeNull();
  } finally {
    Modal.destroyAll();
    app.unmount();
    host.remove();
  }
});

it('lets the importing operator retry a failed legacy batch without uploading again', async () => {
  const failed = {
    batchId: '2',
    status: 4,
    totalRows: 6,
    validRows: 6,
    invalidRows: 0,
    rows: [],
  };
  vi.mocked(getYouzanCustomerImportResult).mockResolvedValue(failed);
  vi.mocked(confirmYouzanCustomerImport).mockResolvedValue({
    ...failed,
    status: 1,
    importedRows: 6,
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(MemberImport);
  const button = (label: string) =>
    [...document.querySelectorAll('button')].find(
      (element) => element.textContent?.replaceAll(/\s/g, '') === label,
    )!;
  try {
    app.mount(host);
    button('查询批次').click();
    await vi.waitFor(() =>
      expect(document.querySelector('#member-youzan-batch')).toBeTruthy(),
    );
    const input = document.querySelector<HTMLInputElement>(
      '#member-youzan-batch',
    )!;
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(button('查询').disabled).toBe(false));
    button('查询').click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain('历史批次处理失败'),
    );
    button('重试处理').click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain('可凭手机号领取'),
    );
    expect(confirmYouzanCustomerImport).toHaveBeenCalledWith('2');
  } finally {
    app.unmount();
    host.remove();
  }
});
