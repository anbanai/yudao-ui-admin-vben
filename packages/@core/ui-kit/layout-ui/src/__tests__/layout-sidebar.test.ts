import { createApp } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import LayoutSidebar from '../components/layout-sidebar.vue';

function mountFloatingMixedSidebar() {
  const host = document.createElement('div');
  const onUpdateWidth = vi.fn();
  const app = createApp(LayoutSidebar, {
    collapse: false,
    draggable: true,
    expandOnHover: true,
    expandOnHovering: false,
    extraCollapse: false,
    extraVisible: true,
    extraWidth: 260,
    fixedExtra: true,
    headerHeight: 0,
    isSidebarMixed: true,
    'onUpdate:width': onUpdateWidth,
    panelFloat: true,
    panelGap: 12,
    show: true,
    showCollapseButton: false,
    showFixedButton: false,
    theme: 'dark',
    themeSub: 'dark',
    width: 80,
  });

  app.mount(host);

  return { app, host, onUpdateWidth };
}

describe('layout-sidebar.vue', () => {
  it('keeps the floating mixed-menu panel inside the sidebar clipping area', () => {
    const { app, host } = mountFloatingMixedSidebar();

    const placeholder = host.firstElementChild as HTMLElement;
    const sidebar = host.querySelector<HTMLElement>(
      '[data-layout-region="sidebar"]',
    );
    const extraPanel =
      sidebar?.querySelector<HTMLElement>(':scope > div.fixed');
    const dragBar = sidebar?.querySelector<HTMLElement>(
      ':scope > div.cursor-col-resize',
    );

    expect(placeholder.style.flexBasis).toBe('376px');
    expect(sidebar?.style.width).toBe('352px');
    expect(sidebar?.style.clipPath).toBe('inset(0 0px 0 0)');
    expect(extraPanel?.style.left).toBe('92px');
    expect(extraPanel?.style.width).toBe('260px');
    expect(dragBar?.style.right).toBe('0px');

    app.unmount();
  });

  it('preserves the extra panel width when a floating mixed sidebar drag does not move', () => {
    const { app, host, onUpdateWidth } = mountFloatingMixedSidebar();
    const sidebar = host.querySelector<HTMLElement>(
      '[data-layout-region="sidebar"]',
    );
    const dragBar = sidebar?.querySelector<HTMLElement>(
      ':scope > div.cursor-col-resize',
    );

    expect(sidebar).not.toBeNull();
    expect(dragBar).not.toBeNull();

    vi.spyOn(sidebar!, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(12, 0, 352, 700),
    );
    dragBar!.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 364 }),
    );
    document.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, clientX: 364 }),
    );

    expect(onUpdateWidth).toHaveBeenCalledWith(260);

    app.unmount();
  });
});
