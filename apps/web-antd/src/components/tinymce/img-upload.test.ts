import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ImgUpload from './img-upload.vue';

const { uploadTestState } = vi.hoisted(() => ({
  uploadTestState: {
    id: 0,
    requests: [] as Array<{
      reject: (reason?: unknown) => void;
      resolve: (url: string) => void;
    }>,
  },
}));

vi.mock('@vben/utils', () => ({
  buildShortUUID: () => `upload-${++uploadTestState.id}`,
}));

vi.mock('#/components/upload/use-upload', () => ({
  useUpload: () => ({
    httpRequest: () =>
      new Promise<string>((resolve, reject) => {
        uploadTestState.requests.push({ reject, resolve });
      }),
  }),
}));

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    Button: defineComponent(
      (_props, { slots }) =>
        () =>
          h('span', slots.default?.()),
    ),
    Upload: defineComponent({
      props: {
        customRequest: {
          default: undefined,
          type: Function,
        },
      },
      setup(props, { slots }) {
        const startUpload = () =>
          props.customRequest?.({
            file: new File(['image'], 'duplicate.png', { type: 'image/png' }),
          });
        return () =>
          h('div', [
            slots.default?.(),
            h(
              'button',
              { 'data-testid': 'select-first', onClick: startUpload },
              'first',
            ),
            h(
              'button',
              { 'data-testid': 'select-second', onClick: startUpload },
              'second',
            ),
          ]);
      },
    }),
  };
});

async function flushPromises() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
}

describe('tinymce image upload requests', () => {
  let app: ReturnType<typeof createApp> | undefined;
  let host: HTMLDivElement | undefined;

  beforeEach(() => {
    uploadTestState.id = 0;
    uploadTestState.requests = [];
  });

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
    vi.clearAllMocks();
  });

  it('tracks duplicate filenames independently through out-of-order completion', async () => {
    const uploadIds: string[] = [];
    const completed: Array<[string, string]> = [];
    const uploadingStates: boolean[] = [];
    const Parent = defineComponent(
      () => () =>
        h(ImgUpload, {
          onDone: (id: string, url: string) => completed.push([id, url]),
          onUploading: (id: string) => uploadIds.push(id),
          onUploadingChange: (uploading: boolean) =>
            uploadingStates.push(uploading),
        }),
    );
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(Parent);
    app.mount(host);

    host
      .querySelector<HTMLButtonElement>('[data-testid="select-first"]')
      ?.click();
    host
      .querySelector<HTMLButtonElement>('[data-testid="select-second"]')
      ?.click();
    await flushPromises();

    expect(uploadIds).toHaveLength(2);
    expect(new Set(uploadIds).size).toBe(2);
    expect(uploadingStates).toEqual([true]);

    uploadTestState.requests[1]!.resolve('https://example.com/second.png');
    await flushPromises();
    expect(completed).toEqual([
      [uploadIds[1], 'https://example.com/second.png'],
    ]);
    expect(uploadingStates).toEqual([true]);

    uploadTestState.requests[0]!.resolve('https://example.com/first.png');
    await flushPromises();
    expect(completed).toEqual([
      [uploadIds[1], 'https://example.com/second.png'],
      [uploadIds[0], 'https://example.com/first.png'],
    ]);
    expect(uploadingStates).toEqual([true, false]);
  });
});
