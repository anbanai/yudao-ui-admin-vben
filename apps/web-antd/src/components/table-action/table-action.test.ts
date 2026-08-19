import { createPinia, setActivePinia } from 'pinia';
import { createApp } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAccessStore } from '@vben/stores';

import TableAction from './table-action.vue';

describe('table-action', () => {
  let host: HTMLDivElement;
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    useAccessStore().setAccessCodes(['product:spu:create']);
    host = document.createElement('div');
    document.body.append(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('renders actions without the Ant Design Space wrapper', () => {
    const app = createApp(TableAction, {
      actions: [
        {
          auth: ['product:spu:create'],
          label: '创建商品',
          type: 'primary',
        },
        {
          label: '详情',
          type: 'link',
        },
      ],
    });
    app.use(pinia);
    app.mount(host);

    expect(host.querySelector('.ant-space')).toBeNull();
    expect(host.textContent).toContain('创建商品');
    expect(host.textContent).toContain('详情');

    app.unmount();
  });
});
