import type { HotZoneProperty } from './config';

import { createApp, nextTick, reactive } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { component } from './config';
import HotZone from './index.vue';

describe('hot zone', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  function mountHotZone(property: HotZoneProperty, onClick?: () => void) {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(HotZone, { property, onClick });
    app.mount(host);
    cleanups.push(() => {
      app.unmount();
      host.remove();
    });
    return host;
  }

  it('renders the content image as a block without an inline wrapper gap', () => {
    const host = mountHotZone({
      imgUrl: '/hot-zone.png',
      list: [],
      style: component.property.style,
    });

    const container = host.firstElementChild;
    const image = container?.firstElementChild;
    expect(image?.tagName).toBe('IMG');
    expect(image?.classList.contains('block')).toBe(true);
    expect(image?.getAttribute('draggable')).toBe('false');
  });

  it('shows a selectable placeholder for an unconfigured hot zone', () => {
    let selections = 0;
    const host = mountHotZone(component.property, () => selections++);

    expect(host.querySelector('img')).toBeNull();
    const placeholder = host.querySelector('[role="status"]');
    expect(placeholder?.textContent).toContain('热区未设置底图');
    placeholder?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(selections).toBe(1);
  });

  it('shows a selectable placeholder after a broken image and retries a replacement', async () => {
    const property = reactive({
      imgUrl: '/missing-hot-zone.png',
      list: [
        {
          name: '品牌自营',
          url: '/pages/goods/group-list',
          width: 189,
          height: 220,
          top: 0,
          left: 0,
        },
      ],
      style: component.property.style,
    });
    let selections = 0;
    const host = mountHotZone(property, () => selections++);

    host.querySelector('img')!.dispatchEvent(new Event('error'));
    await nextTick();

    const placeholder = host.querySelector('[role="status"]');
    expect(placeholder?.textContent).toContain('底图加载失败');
    expect(host.textContent).not.toContain('品牌自营');
    placeholder?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(selections).toBe(1);

    property.imgUrl = '/replacement-hot-zone.png';
    await nextTick();
    expect(host.querySelector('[role="status"]')).toBeNull();
    expect(host.querySelector('img')?.getAttribute('src')).toBe(
      property.imgUrl,
    );
    expect(host.textContent).toContain('品牌自营');
  });
});
