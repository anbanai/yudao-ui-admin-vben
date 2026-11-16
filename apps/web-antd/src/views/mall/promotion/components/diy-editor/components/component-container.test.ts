import { createApp, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vben/icons', () => ({
  IconifyIcon: { template: '<i />' },
}));

vi.mock('./mobile', () => ({
  components: {
    TestComponent: { template: '<div class="test-component" />' },
  },
}));

const { default: ComponentContainer } =
  await import('./component-container.vue');

describe('ComponentContainer toolbar', () => {
  let app: ReturnType<typeof createApp> | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
  });

  it('renders all component actions when the component is active', async () => {
    host = document.createElement('div');
    document.body.append(host);
    const moves: number[] = [];
    let copies = 0;
    let deletes = 0;

    app = createApp(ComponentContainer, {
      component: {
        id: 'TestComponent',
        name: '测试组件',
        property: { style: {} },
      },
      active: true,
      canMoveUp: true,
      canMoveDown: true,
      showToolbar: true,
      onMove: (direction: number) => moves.push(direction),
      onCopy: () => copies++,
      onDelete: () => deletes++,
    });
    app.directive('tippy', {});
    app.mount(host);
    await nextTick();

    const toolbar = host.querySelector('.component-toolbar');
    expect(toolbar).toBeTruthy();
    const buttons = toolbar?.querySelectorAll('.component-toolbar-buttons button');
    expect(buttons).toHaveLength(4);

    buttons?.[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons?.[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons?.[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons?.[3]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(moves).toEqual([-1, 1]);
    expect(copies).toBe(1);
    expect(deletes).toBe(1);
  });
});
