import { createApp } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import HotZone from './index.vue';

describe('HotZone', () => {
  const hosts: HTMLDivElement[] = [];

  afterEach(() => {
    for (const host of hosts.splice(0)) {
      host.remove();
    }
  });

  it('renders the content image as a block without an inline wrapper gap', () => {
    const host = document.createElement('div');
    hosts.push(host);
    document.body.append(host);

    const app = createApp(HotZone, {
      property: {
        imgUrl: '/hot-zone.png',
        list: [],
        style: {},
      },
    });
    app.mount(host);

    const container = host.firstElementChild;
    const image = container?.firstElementChild;
    expect(image?.tagName).toBe('IMG');
    expect(image?.classList.contains('block')).toBe(true);
    expect(image?.getAttribute('draggable')).toBe('false');

    app.unmount();
  });
});
