import { createApp } from 'vue';

import { expect, it, vi } from 'vitest';

import Popover from './index.vue';

vi.mock('@vben/icons', () => ({
  IconifyIcon: { template: '<i />' },
}));

it('keeps the preview frame transparent around the ad image', () => {
  const host = document.createElement('div');
  const app = createApp(Popover, {
    property: {
      list: [{ imgUrl: '/popup.png', showType: 'once', url: '' }],
    },
  });
  app.mount(host);
  try {
    const frame = host.querySelector('img')?.closest('div.absolute');
    expect(frame).toBeInstanceOf(HTMLDivElement);
    expect((frame as HTMLDivElement).style.backgroundColor).toBe('transparent');
  } finally {
    app.unmount();
  }
});
