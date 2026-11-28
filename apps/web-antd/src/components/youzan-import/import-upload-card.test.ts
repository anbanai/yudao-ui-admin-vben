import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import ImportUploadCard from './import-upload-card.vue';

let app: ReturnType<typeof createApp> | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  app?.unmount();
  host?.remove();
});

async function render() {
  const file = ref<File>();
  const preview = vi.fn(() => file.value);
  host = document.createElement('div');
  document.body.append(host);
  app = createApp({
    render: () =>
      h(ImportUploadCard, {
        busy: false,
        file: file.value,
        onFile: (selected) => {
          file.value = selected;
        },
        onPreview: preview,
      }),
  });
  app.mount(host);
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
  return { chooseFile, preview, submit };
}

describe('youzan import upload form', () => {
  it('previews a file without a merchant or a grant lookup', async () => {
    const { chooseFile, preview, submit } = await render();
    expect(host?.querySelector('.ant-select')).toBeNull();
    expect(submit.disabled).toBe(true);
    const selected = new File(['synthetic'], '客户.xlsx');
    await chooseFile(selected);
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    submit.click();
    expect(preview).toHaveReturnedWith(selected);
  });

  it('clears the previous Excel selection when a replacement is invalid', async () => {
    const { chooseFile, submit } = await render();
    await chooseFile(new File(['synthetic'], '商品.xlsx'));
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    await chooseFile(new File(['synthetic'], '商品.csv'));
    await vi.waitFor(() => expect(submit.disabled).toBe(true));
    expect(host?.textContent).not.toContain('商品.xlsx');
  });
});
