import type { PromotionRenderDependencies } from './promotion-renderer';
import type { PromotionContext } from './promotion-share';

import { describe, expect, it, vi } from 'vitest';

import {
  PROMOTION_ASSET_SIZES,
  renderPromotionAsset,
  wrapCanvasText,
} from './promotion-renderer';

const promotionContext: PromotionContext = {
  h5Url: 'https://mall.example.com/store?spm=0.2.88.1.3',
  identity: {
    avatarUrl: '/avatar.png',
    kind: 'member',
    name: '推广员',
    shareId: 27,
  },
  marketPriceText: '¥129.00',
  miniProgramPath: 'pages/index/index',
  miniProgramScene: 'spm=27.2.88.3.2',
  picUrl: 'https://static.example.com/product.png',
  priceText: '¥99.00',
  productId: 88,
  productName: '明前绿茶礼盒',
};

describe('推广图片渲染', () => {
  it('声明稳定输出尺寸', () => {
    expect(PROMOTION_ASSET_SIZES).toEqual({
      card: { height: 800, width: 1000 },
      h5: { height: 800, width: 800 },
      poster: { height: 1000, width: 600 },
    });
  });

  it('长标题限制为两行', () => {
    const measure = vi.fn((text: string) => ({ width: text.length * 10 }));
    const lines = wrapCanvasText(
      '这是一段很长的商品名称用于测试截断',
      80,
      2,
      measure,
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
  });

  it.each([
    ['poster', 600, 1000],
    ['card', 1000, 800],
    ['h5', 800, 800],
  ] as const)('renders %s at %sx%s', async (type, width, height) => {
    const { deps, lastCanvas } = createFakeRenderDependencies();
    const blob = await renderPromotionAsset(
      {
        context: promotionContext,
        miniProgramQrCode:
          type === 'h5' ? undefined : 'data:image/png;base64,qr',
        type,
      },
      deps,
    );
    expect(lastCanvas()).toMatchObject({ height, width });
    expect(blob.type).toBe('image/png');
  });

  it('requires a small-program QR for poster and card', async () => {
    const { deps } = createFakeRenderDependencies();
    await expect(
      renderPromotionAsset({ context: promotionContext, type: 'poster' }, deps),
    ).rejects.toThrow('缺少小程序二维码');
    await expect(
      renderPromotionAsset({ context: promotionContext, type: 'card' }, deps),
    ).rejects.toThrow('缺少小程序二维码');
  });

  it('generates an H5 QR from context.h5Url', async () => {
    const { deps, qrCalls, lastCanvas } = createFakeRenderDependencies();
    await renderPromotionAsset({ context: promotionContext, type: 'h5' }, deps);
    expect(qrCalls).toEqual([{ text: promotionContext.h5Url, width: 280 }]);
    expect(lastCanvas()?.context.filledTexts).toEqual(
      expect.arrayContaining(['推广员', '扫码进入商品详情']),
    );
  });

  it('falls back to the shop logo when avatar loading fails', async () => {
    const { deps, loadedUrls } = createFakeRenderDependencies({
      failingUrls: new Set(['/avatar.png']),
    });
    await renderPromotionAsset(
      {
        context: promotionContext,
        miniProgramQrCode: 'data:image/png;base64,qr',
        type: 'poster',
      },
      deps,
    );
    expect(loadedUrls).toContain('/branding/logo-mark.png');
  });

  it.each(['poster', 'card'] as const)('%s 包含扫码提示', async (type) => {
    const { deps, lastCanvas } = createFakeRenderDependencies();
    await renderPromotionAsset(
      {
        context: promotionContext,
        miniProgramQrCode: 'data:image/png;base64,qr',
        type,
      },
      deps,
    );
    expect(lastCanvas()?.context.filledTexts).toContain('扫码进入商品详情');
  });

  it('rejects when canvas export returns a null Blob', async () => {
    const { deps } = createFakeRenderDependencies({ nullBlob: true });
    await expect(
      renderPromotionAsset(
        {
          context: promotionContext,
          miniProgramQrCode: 'data:image/png;base64,qr',
          type: 'poster',
        },
        deps,
      ),
    ).rejects.toThrow('推广图片导出失败');
  });
});

interface FakeRenderOptions {
  failingUrls?: Set<string>;
  nullBlob?: boolean;
}

function createFakeRenderDependencies(options: FakeRenderOptions = {}) {
  const canvases: FakeCanvas[] = [];
  const loadedUrls: string[] = [];
  const qrCalls: Array<{ text: string | undefined; width: number }> = [];
  const deps: PromotionRenderDependencies = {
    createCanvas: (width, height) => {
      const canvas = new FakeCanvas(width, height, options.nullBlob);
      canvases.push(canvas);
      return canvas as unknown as HTMLCanvasElement;
    },
    loadImage: async (url) => {
      loadedUrls.push(url);
      if (options.failingUrls?.has(url)) {
        throw new Error('image load failed');
      }
      return { height: 100, width: 100 } as HTMLImageElement;
    },
    toQrDataUrl: async (text, width) => {
      qrCalls.push({ text, width });
      return 'data:image/png;base64,generated-qr';
    },
  };
  return {
    deps,
    lastCanvas: () => canvases.at(-1),
    loadedUrls,
    qrCalls,
  };
}

class FakeCanvas {
  readonly context = new FakeCanvasContext();

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly nullBlob = false,
  ) {}

  getContext(kind: string) {
    return kind === '2d' ? this.context : null;
  }

  toBlob(callback: BlobCallback, type?: string) {
    callback(
      this.nullBlob ? null : new Blob(['png'], { type: type ?? 'image/png' }),
    );
  }
}

class FakeCanvasContext {
  readonly filledTexts: string[] = [];
  fillStyle = '';
  font = '';
  textAlign: CanvasTextAlign = 'left';
  textBaseline: CanvasTextBaseline = 'alphabetic';

  drawImage() {}
  fillRect() {}
  fillText(text: string) {
    this.filledTexts.push(text);
  }
  measureText(text: string) {
    return { width: text.length * 10 } as TextMetrics;
  }
}
