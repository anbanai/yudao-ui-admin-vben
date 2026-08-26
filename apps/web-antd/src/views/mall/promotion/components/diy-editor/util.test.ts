import { describe, expect, it } from 'vitest';

import {
  getComponentBackgroundStyle,
  getComponentOverflow,
  getPageBackgroundStyle,
} from './util';

describe('getComponentOverflow', () => {
  it('allows sticky product group menus to escape the component clip', () => {
    expect(getComponentOverflow('ProductGroup', true)).toBe('visible');
    expect(getComponentOverflow('ProductGroup', false)).toBe('hidden');
    expect(getComponentOverflow('ProductList', true)).toBe('hidden');
  });
});

describe('getComponentBackgroundStyle', () => {
  it('keeps a color background from being overwritten by an image', () => {
    expect(
      getComponentBackgroundStyle({
        bgType: 'color',
        bgColor: '#123456',
      } as any),
    ).toEqual({ backgroundColor: '#123456', backgroundImage: 'none' });
  });

  it('uses the configured image for image backgrounds', () => {
    expect(
      getComponentBackgroundStyle({
        bgType: 'img',
        bgImg: '/cover.png',
      } as any),
    ).toEqual({
      backgroundColor: 'transparent',
      backgroundImage: 'url(/cover.png)',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
    });
  });
});

describe('getPageBackgroundStyle', () => {
  it('keeps a page color visible when no background image is configured', () => {
    expect(
      getPageBackgroundStyle({
        backgroundColor: '#ff0000',
        backgroundImage: '',
      }),
    ).toEqual({
      backgroundColor: '#ff0000',
      backgroundImage: 'none',
    });
  });

  it('uses the page image without replacing the configured color fallback', () => {
    expect(
      getPageBackgroundStyle({
        backgroundColor: '#ffffff',
        backgroundImage: '/background.png',
      }),
    ).toEqual({
      backgroundColor: '#ffffff',
      backgroundImage: 'url(/background.png)',
    });
  });
});
