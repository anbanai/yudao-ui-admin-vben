import { createApp } from 'vue';

import { describe, expect, it } from 'vitest';

import LayoutContent from '../components/layout-content.vue';

describe('layout-content.vue', () => {
  it('stretches the floating panel card to the available content height', () => {
    const host = document.createElement('div');
    const app = createApp(LayoutContent, {
      contentCompact: 'wide',
      contentCompactWidth: 1200,
      padding: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      panelFloat: true,
      panelGap: 12,
    });

    app.mount(host);

    const main = host.querySelector('main');
    const panel = main?.querySelector(':scope > div');
    expect(main).not.toBeNull();
    expect(main?.classList.contains('flex')).toBe(true);
    expect(main?.classList.contains('flex-col')).toBe(true);
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('flex-1')).toBe(true);

    app.unmount();
  });
});
