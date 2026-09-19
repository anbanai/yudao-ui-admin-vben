import type { PromotionAssetType, PromotionContext } from './promotion-share';

import QRCode from 'qrcode';

export interface PromotionRenderDependencies {
  createCanvas: (width: number, height: number) => HTMLCanvasElement;
  loadImage: (url: string, timeoutMs?: number) => Promise<HTMLImageElement>;
  toQrDataUrl: (text: string, width: number) => Promise<string>;
}

export interface PromotionRenderInput {
  context: PromotionContext;
  miniProgramQrCode?: string;
  type: PromotionAssetType;
}

export const PROMOTION_ASSET_SIZES = {
  card: { height: 800, width: 1000 },
  h5: { height: 800, width: 800 },
  poster: { height: 1000, width: 600 },
} as const;

const SHOP_LOGO_URL = '/branding/logo-mark.png';
const SCAN_PROMPT = '扫码进入商品详情';

export function wrapCanvasText(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (text: string) => { width: number },
): string[] {
  if (maxLines <= 0 || !text) return [];
  const lines: string[] = [];
  let current = '';
  for (const character of text) {
    const candidate = current + character;
    if (measure(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = character;
    if (lines.length === maxLines) {
      const previousLine = lines[maxLines - 1];
      if (previousLine === undefined) return lines;
      return [
        ...lines.slice(0, -1),
        truncateLine(`${previousLine}${current}`, maxWidth, measure),
      ];
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  lines.length = maxLines;
  const lastLine = lines[maxLines - 1];
  if (lastLine !== undefined) {
    lines[maxLines - 1] = truncateLine(lastLine, maxWidth, measure);
  }
  return lines;
}

function truncateLine(
  line: string,
  maxWidth: number,
  measure: (text: string) => { width: number },
): string {
  const ellipsis = '…';
  let result = line;
  while (result && measure(`${result}${ellipsis}`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}${ellipsis}`;
}

const browserDependencies: PromotionRenderDependencies = {
  createCanvas: (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
  loadImage: loadBrowserImage,
  toQrDataUrl: (text, width) =>
    QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width }),
};

export async function renderPromotionAsset(
  input: PromotionRenderInput,
  dependencies: PromotionRenderDependencies = browserDependencies,
): Promise<Blob> {
  if (
    (input.type === 'poster' || input.type === 'card') &&
    !input.miniProgramQrCode
  ) {
    throw new Error('缺少小程序二维码');
  }
  if (input.type === 'h5' && !input.context.h5Url) {
    throw new Error('缺少 H5 地址');
  }

  const size = PROMOTION_ASSET_SIZES[input.type];
  const canvas = dependencies.createCanvas(size.width, size.height);
  const context2d = canvas.getContext('2d');
  if (!context2d) throw new Error('当前浏览器不支持图片生成');
  if (input.type === 'poster') {
    await drawPoster(context2d, input, dependencies);
  } else if (input.type === 'card') {
    await drawCard(context2d, input, dependencies);
  } else {
    await drawH5QrImage(context2d, input, dependencies);
  }
  return canvasToPngBlob(canvas);
}

async function drawPoster(
  context: CanvasRenderingContext2D,
  input: PromotionRenderInput,
  dependencies: PromotionRenderDependencies,
) {
  const { context: promotion } = input;
  paintBackground(context, 600, 1000);
  await drawCoverImage(context, promotion.picUrl, dependencies, 0, 0, 600, 600);
  drawTitle(context, promotion.productName, 32, 660, 536, 32);
  drawPrice(context, promotion, 32, 748);
  await drawIdentity(context, promotion, dependencies, 32, 825);
  await drawQrImage(
    context,
    input.miniProgramQrCode!,
    dependencies,
    430,
    760,
    140,
  );
  drawScanPrompt(context, SCAN_PROMPT, 410, 925, 160);
}

async function drawCard(
  context: CanvasRenderingContext2D,
  input: PromotionRenderInput,
  dependencies: PromotionRenderDependencies,
) {
  const { context: promotion } = input;
  paintBackground(context, 1000, 800);
  await drawCoverImage(context, promotion.picUrl, dependencies, 0, 0, 500, 800);
  drawTitle(context, promotion.productName, 540, 130, 410, 32);
  drawPrice(context, promotion, 540, 300);
  await drawIdentity(context, promotion, dependencies, 540, 500);
  await drawQrImage(
    context,
    input.miniProgramQrCode!,
    dependencies,
    750,
    500,
    180,
  );
  drawScanPrompt(context, SCAN_PROMPT, 735, 700, 210);
}

async function drawH5QrImage(
  context: CanvasRenderingContext2D,
  input: PromotionRenderInput,
  dependencies: PromotionRenderDependencies,
) {
  const promotion = input.context;
  paintBackground(context, 800, 800);
  await drawCoverImage(context, promotion.picUrl, dependencies, 0, 0, 800, 320);
  await drawIdentity(context, promotion, dependencies, 48, 350);
  drawTitle(context, promotion.productName, 48, 440, 704, 34);
  drawPrice(context, promotion, 48, 555);
  const qrUrl = await dependencies.toQrDataUrl(promotion.h5Url!, 280);
  await drawQrImage(context, qrUrl, dependencies, 260, 610, 150);
  drawScanPrompt(context, SCAN_PROMPT, 435, 665, 300);
}

function paintBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
}

async function drawCoverImage(
  context: CanvasRenderingContext2D,
  url: string,
  dependencies: PromotionRenderDependencies,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const image = await dependencies.loadImage(url);
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;
  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function drawTitle(
  context: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
) {
  context.fillStyle = '#1f2937';
  context.font = `600 ${fontSize}px sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  const lines = wrapCanvasText(
    title,
    maxWidth,
    2,
    context.measureText.bind(context),
  );
  lines.forEach((line, index) =>
    context.fillText(line, x, y + index * (fontSize + 10)),
  );
}

function drawPrice(
  context: CanvasRenderingContext2D,
  promotion: PromotionContext,
  x: number,
  y: number,
) {
  context.fillStyle = '#e11d48';
  context.font = '700 36px sans-serif';
  context.textBaseline = 'top';
  context.fillText(promotion.priceText, x, y);
  if (promotion.marketPriceText) {
    context.fillStyle = '#9ca3af';
    context.font = '22px sans-serif';
    const priceWidth = context.measureText(promotion.priceText).width;
    context.fillText(promotion.marketPriceText, x + priceWidth + 18, y + 8);
  }
}

function drawScanPrompt(
  context: CanvasRenderingContext2D,
  prompt: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  context.fillStyle = '#6b7280';
  context.font = '20px sans-serif';
  context.textBaseline = 'top';
  const lines = wrapCanvasText(
    prompt,
    maxWidth,
    2,
    context.measureText.bind(context),
  );
  lines.forEach((line, index) => context.fillText(line, x, y + index * 26));
}

async function drawIdentity(
  context: CanvasRenderingContext2D,
  promotion: PromotionContext,
  dependencies: PromotionRenderDependencies,
  x: number,
  y: number,
) {
  const avatar = await loadAvatarWithFallback(
    promotion.identity.avatarUrl,
    dependencies,
  );
  context.drawImage(avatar, x, y, 64, 64);
  context.fillStyle = '#374151';
  context.font = '24px sans-serif';
  context.textBaseline = 'middle';
  context.fillText(promotion.identity.name, x + 80, y + 32);
}

async function loadAvatarWithFallback(
  avatarUrl: string,
  dependencies: PromotionRenderDependencies,
) {
  try {
    return await dependencies.loadImage(avatarUrl);
  } catch {
    return dependencies.loadImage(SHOP_LOGO_URL);
  }
}

async function drawQrImage(
  context: CanvasRenderingContext2D,
  url: string,
  dependencies: PromotionRenderDependencies,
  x: number,
  y: number,
  size: number,
) {
  const image = await dependencies.loadImage(url);
  context.drawImage(image, x, y, size, size);
}

async function loadBrowserImage(
  url: string,
  timeoutMs = 10_000,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const timer = window.setTimeout(
      () => settleReject(new Error('图片加载超时')),
      timeoutMs,
    );
    const onLoad = () => settleResolve();
    const onError = () => settleReject(new Error('图片加载失败'));
    const cleanup = () => {
      window.clearTimeout(timer);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    };
    const settleResolve = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(image);
    };
    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    image.addEventListener('load', onLoad);
    image.addEventListener('error', onError);
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('推广图片导出失败'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    } catch {
      reject(new Error('推广图片导出失败'));
    }
  });
}
