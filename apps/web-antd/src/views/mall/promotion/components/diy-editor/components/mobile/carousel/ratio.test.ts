import { afterEach, describe, expect, it, vi } from 'vitest';

import { prepareDiyCarouselRatios } from './ratio';

afterEach(() => vi.unstubAllGlobals());

describe('persisting adaptive Banner sizes', () => {
  it('uses the first readable image or video cover in display order', async () => {
    vi.stubGlobal(
      'Image',
      class extends EventTarget {
        naturalHeight = 300;
        naturalWidth = 750;
        url = '';

        get src() {
          return this.url;
        }

        set src(url: string) {
          this.url = url;
          queueMicrotask(() => {
            if (url === 'broken.jpg') {
              this.dispatchEvent(new Event('error'));
            } else {
              this.naturalWidth = url === 'cover.jpg' ? 600 : 750;
              this.dispatchEvent(new Event('load'));
            }
          });
        }
      },
    );
    const property = JSON.stringify({
      components: [
        {
          id: 'Carousel',
          property: {
            aspectRatio: 3,
            height: 174,
            heightMode: 'adaptive',
            items: [
              { imgUrl: 'broken.jpg', type: 'img' },
              { imgUrl: 'cover.jpg', type: 'video', videoUrl: 'video.mp4' },
              { imgUrl: 'later.jpg', type: 'img' },
            ],
          },
        },
        { id: 'Carousel', property: { height: 160, items: [] } },
      ],
    });

    const result = JSON.parse(await prepareDiyCarouselRatios(property));
    expect(result.components[0].property.aspectRatio).toBe(2);
    expect(result.components[0].property.aspectRatioSource).toBe('cover.jpg');
    expect(result.components[1].property).toEqual({ height: 160, items: [] });
  });

  it('reuses a saved ratio for the same source without fetching it at save time', async () => {
    vi.stubGlobal('Image', undefined);
    const carousel = {
      aspectRatio: 2,
      aspectRatioSource: 'cover.jpg',
      height: 174,
      heightMode: 'adaptive',
      items: [{ imgUrl: 'cover.jpg', type: 'img' }],
    };
    const property = JSON.stringify({
      components: [{ id: 'Carousel', property: carousel }],
    });
    const result = JSON.parse(await prepareDiyCarouselRatios(property));
    expect(result.components[0].property).toEqual(carousel);
  });

  it('drops the old ratio when the adaptive Banner has no readable cover', async () => {
    const property = JSON.stringify({
      components: [
        {
          id: 'Carousel',
          property: {
            aspectRatio: 2,
            aspectRatioSource: 'removed-cover.jpg',
            height: 200,
            heightMode: 'adaptive',
            items: [{ type: 'video', videoUrl: 'video.mp4' }],
          },
        },
      ],
    });

    const result = JSON.parse(await prepareDiyCarouselRatios(property));
    expect(result.components[0].property).toMatchObject({
      height: 200,
      heightMode: 'adaptive',
    });
    expect(result.components[0].property).not.toHaveProperty('aspectRatio');
    expect(result.components[0].property).not.toHaveProperty(
      'aspectRatioSource',
    );
  });
});
