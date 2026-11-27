import type { CarouselProperty } from './config';

import { createApp, nextTick, reactive } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import CarouselPreview from './index.vue';

vi.mock('@vben/icons', () => ({ IconifyIcon: { template: '<i />' } }));
vi.mock('ant-design-vue', () => ({
  Carousel: { template: '<div class="ant-carousel"><slot /></div>' },
  Image: { template: '<img />' },
}));

const cleanups: Array<() => void> = [];

function mountPreview(overrides: Partial<CarouselProperty>) {
  const property = reactive<CarouselProperty>({
    autoplay: false,
    height: 174,
    indicator: 'dot',
    interval: 3,
    items: [{ imgUrl: 'banner.jpg', type: 'img', url: '', videoUrl: '' }],
    style: {} as CarouselProperty['style'],
    type: 'default',
    ...overrides,
  });
  const host = document.createElement('div');
  const app = createApp(CarouselPreview, { property });
  app.mount(host);
  cleanups.push(() => app.unmount());
  return { host, property };
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

describe('carousel preview', () => {
  it('reserves the saved ratio, then uses the replacement cover dimensions', async () => {
    const requests: EventTarget[] = [];
    vi.stubGlobal(
      'Image',
      class extends EventTarget {
        naturalHeight = 250;
        naturalWidth = 750;
        src = '';

        constructor() {
          super();
          requests.push(this);
        }
      },
    );
    const { host, property } = mountPreview({
      aspectRatio: 2,
      aspectRatioSource: 'banner.jpg',
      heightMode: 'adaptive',
    });
    const frame = host.querySelector<HTMLElement>('.carousel-adaptive')!;
    expect(frame.style.aspectRatio).toBe('2 / 1');
    await nextTick();
    expect(requests).toHaveLength(0);
    property.items[0]!.imgUrl = 'replacement.jpg';
    await nextTick();
    for (const request of requests) request.dispatchEvent(new Event('load'));

    await vi.waitFor(() => expect(frame.style.aspectRatio).toBe('3 / 1'));
    expect(frame.querySelector('img')?.classList.contains('object-cover')).toBe(
      true,
    );
  });

  it('renders an existing fixed-height Banner with its stored height', () => {
    const { host } = mountPreview({ height: 160 });
    expect(host.querySelector<HTMLElement>('.ant-carousel')?.style.height).toBe(
      '160px',
    );
    expect(host.querySelector('.carousel-adaptive')).toBeNull();
  });
});
