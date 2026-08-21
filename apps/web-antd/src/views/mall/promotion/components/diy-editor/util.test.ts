import { describe, expect, it } from 'vitest';

import { getComponentBackgroundStyle } from './util';

describe('getComponentBackgroundStyle', () => {
  it('keeps a color background from being overwritten by an image', () => {
    expect(
      getComponentBackgroundStyle({ bgType: 'color', bgColor: '#123456' } as any),
    ).toEqual({ backgroundColor: '#123456', backgroundImage: 'none' });
  });

  it('uses the configured image for image backgrounds', () => {
    expect(
      getComponentBackgroundStyle({ bgType: 'img', bgImg: '/cover.png' } as any),
    ).toEqual({
      backgroundColor: 'transparent',
      backgroundImage: 'url(/cover.png)',
    });
  });
});
