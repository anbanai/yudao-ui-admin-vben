import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import ImportUploadCard from './import-upload-card.vue';

let app: ReturnType<typeof createApp> | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  app?.unmount();
  host?.remove();
});

async function render(options: { label: string; value: string }[]) {
  const merchant = ref('');
  const file = ref<File>();
  const preview = vi.fn(() => ({ merchant: merchant.value, file: file.value }));
  host = document.createElement('div');
  document.body.append(host);
  app = createApp({
    render: () =>
      h(ImportUploadCard, {
        busy: false,
        file: file.value,
        loadOptions: async () => options,
        merchant: merchant.value,
        onFile: (selected) => {
          file.value = selected;
        },
        onPreview: preview,
        'onUpdate:merchant': (selected) => {
          merchant.value = selected;
        },
      }),
  });
  app.mount(host);
  await vi.waitFor(() =>
    expect(host?.querySelector('.ant-select-loading')).toBeNull(),
  );
  const submit = [...host.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === '上传并预览',
  )!;
  async function chooseFile(selected: File) {
    const input = host!.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [selected],
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
  }
  return { chooseFile, merchant, preview, submit };
}

describe('youzan import upload form', () => {
  it('automatically selects the only authorized merchant and enables preview after choosing Excel', async () => {
    const { chooseFile, merchant, preview, submit } = await render([
      { label: '一号店', value: '9007199254740993' },
    ]);
    expect(merchant.value).toBe('9007199254740993');
    expect(submit.disabled).toBe(true);
    const selected = new File(['synthetic'], '客户测试名单.xlsx');
    await chooseFile(selected);
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    submit.click();
    await vi.waitFor(() =>
      expect(preview).toHaveReturnedWith({
        merchant: '9007199254740993',
        file: selected,
      }),
    );
  });

  it('explains missing grants and leaves preview disabled with a valid Excel file', async () => {
    const { chooseFile, submit } = await render([]);
    await chooseFile(new File(['synthetic'], '商品.xlsx'));
    expect(host?.textContent).toContain('当前账号没有可导入的商家');
    expect(submit.disabled).toBe(true);
  });

  it('clears the previous Excel selection when a replacement is invalid', async () => {
    const { chooseFile, submit } = await render([
      { label: '一号店', value: '9' },
    ]);
    await chooseFile(new File(['synthetic'], '商品.xlsx'));
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    await chooseFile(new File(['synthetic'], '商品.csv'));
    await vi.waitFor(() => expect(submit.disabled).toBe(true));
    expect(host?.textContent).not.toContain('商品.xlsx');
  });
});
