/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, KeepAlive, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import Tinymce from './editor.vue';

const { editorState } = vi.hoisted(() => ({
  editorState: {
    content: '',
    completeUpload: undefined as
      | ((uploadId: string, url: string) => void)
      | undefined,
    handlers: {} as Record<string, (event?: any) => void>,
  },
}));

vi.mock('@tinymce/tinymce-vue', async () => {
  const { defineComponent, h, onMounted } = await import('vue');

  return {
    default: defineComponent({
      name: 'TestTinyMceEditor',
      props: {
        init: {
          default: () => ({}),
          type: Object,
        },
        modelValue: {
          default: '',
          type: String,
        },
      },
      setup(props) {
        const editor = {
          destroy: vi.fn(),
          dom: {
            createHTML: vi.fn(
              (_tag: string, attributes: Record<string, string>) =>
                `<img src="${attributes.src}"/>`,
            ),
          },
          execCommand: vi.fn(
            (_command: string, _ui: boolean, value: string) => {
              editorState.content += value;
            },
          ),
          getContent: vi.fn(() => editorState.content),
          mode: { set: vi.fn() },
          on: vi.fn((event: string, handler: (event?: any) => void) => {
            editorState.handlers[event] = handler;
          }),
          setContent: vi.fn((value: string) => {
            editorState.content = value;
          }),
        };

        onMounted(() => {
          (props.init as any)?.setup?.(editor);
          editorState.handlers.init?.({});
        });

        return () => h('div');
      },
    }),
  };
});

vi.mock('./img-upload.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      props: {
        disabled: Boolean,
        fullscreen: Boolean,
      },
      emits: ['done', 'error', 'uploading', 'uploadingChange'],
      setup(_props, { emit }) {
        editorState.completeUpload = (uploadId: string, url: string) => {
          emit('done', uploadId, url);
          emit('uploadingChange', false);
        };
        return () =>
          h('div', [
            h(
              'button',
              {
                'data-testid': 'uploading-first',
                onClick: () => {
                  emit('uploading', 'upload-1');
                  emit('uploadingChange', true);
                },
                type: 'button',
              },
              'uploading first',
            ),
            h(
              'button',
              {
                'data-testid': 'uploading-second',
                onClick: () => emit('uploading', 'upload-2'),
                type: 'button',
              },
              'uploading second',
            ),
            h(
              'button',
              {
                'data-testid': 'done-second',
                onClick: () =>
                  emit('done', 'upload-2', 'https://example.com/second.png'),
                type: 'button',
              },
              'done second',
            ),
            h(
              'button',
              {
                'data-testid': 'done-first',
                onClick: () => {
                  emit('done', 'upload-1', 'https://example.com/first.png');
                  emit('uploadingChange', false);
                },
                type: 'button',
              },
              'done first',
            ),
          ]);
      },
    }),
  };
});

describe('tinymce image upload', () => {
  let app: ReturnType<typeof createApp> | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
    editorState.content = '';
    editorState.completeUpload = undefined;
    editorState.handlers = {};
    vi.clearAllMocks();
  });

  it('keeps placeholders out of v-model and preserves out-of-order uploads', async () => {
    const description = ref('');
    const Parent = defineComponent(
      () => () =>
        h(Tinymce, {
          modelValue: description.value,
          'onUpdate:modelValue': (value: string) => {
            description.value = value;
          },
        }),
    );
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(Parent);
    app.mount(host);
    await nextTick();

    host
      .querySelector<HTMLButtonElement>('[data-testid="uploading-first"]')
      ?.click();
    host
      .querySelector<HTMLButtonElement>('[data-testid="uploading-second"]')
      ?.click();
    await nextTick();
    expect(description.value).toBe('');

    host
      .querySelector<HTMLButtonElement>('[data-testid="done-second"]')
      ?.click();
    await nextTick();
    expect(description.value).toBe('');

    host
      .querySelector<HTMLButtonElement>('[data-testid="done-first"]')
      ?.click();
    await nextTick();

    expect(description.value).toBe(
      '<img src="https://example.com/first.png"/><img src="https://example.com/second.png"/>',
    );
  });

  it('forwards aggregate upload state to consumers', async () => {
    const uploadingStates: boolean[] = [];
    const Parent = defineComponent(
      () => () =>
        h(Tinymce, {
          onUploadingChange: (uploading: boolean) => {
            uploadingStates.push(uploading);
          },
        }),
    );
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(Parent);
    app.mount(host);
    await nextTick();

    host
      .querySelector<HTMLButtonElement>('[data-testid="uploading-first"]')
      ?.click();
    host
      .querySelector<HTMLButtonElement>('[data-testid="done-first"]')
      ?.click();
    await nextTick();

    expect(uploadingStates).toEqual([true, false]);
  });

  it('retains the pending placeholder when the editor is reinitialized', async () => {
    const description = ref('');
    const Parent = defineComponent(
      () => () =>
        h(Tinymce, {
          modelValue: description.value,
          'onUpdate:modelValue': (value: string) => {
            description.value = value;
          },
        }),
    );
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(Parent);
    app.mount(host);
    await nextTick();

    host
      .querySelector<HTMLButtonElement>('[data-testid="uploading-first"]')
      ?.click();
    await nextTick();

    editorState.content = '';
    editorState.handlers.init?.({});
    await nextTick();

    host
      .querySelector<HTMLButtonElement>('[data-testid="done-first"]')
      ?.click();
    await nextTick();

    expect(description.value).toBe(
      '<img src="https://example.com/first.png"/>',
    );
  });

  it('buffers upload completion while the editor is deactivated', async () => {
    const active = ref(true);
    const description = ref('');
    const Inactive = defineComponent(() => () => h('div'));
    const Parent = defineComponent(
      () => () =>
        h(KeepAlive, null, {
          default: () =>
            active.value
              ? h(Tinymce, {
                  modelValue: description.value,
                  'onUpdate:modelValue': (value: string) => {
                    description.value = value;
                  },
                })
              : h(Inactive),
        }),
    );
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(Parent);
    app.mount(host);
    await nextTick();

    host
      .querySelector<HTMLButtonElement>('[data-testid="uploading-first"]')
      ?.click();
    active.value = false;
    await nextTick();

    editorState.completeUpload?.(
      'upload-1',
      'https://example.com/deactivated.png',
    );
    await nextTick();

    expect(description.value).toBe(
      '<img src="https://example.com/deactivated.png"/>',
    );
  });
});
