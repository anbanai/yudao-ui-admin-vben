import type { PageConfig } from '../../../util';
import type { CarouselProperty } from './config';

export function getCarouselImageUrls(items: CarouselProperty['items'] = []) {
  return [...new Set(items.map(({ imgUrl }) => imgUrl).filter(Boolean))];
}

const pendingRatios = new Map<string, Promise<number | undefined>>();

function readImageRatio(url: string): Promise<number | undefined> {
  const pending = pendingRatios.get(url);
  if (pending) return pending;

  const request = new Promise<number | undefined>((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => finish(), 3000);

    function finish(ratio?: number) {
      clearTimeout(timer);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      resolve(ratio);
    }

    function onLoad() {
      const { naturalHeight, naturalWidth } = image;
      finish(
        naturalWidth > 0 && naturalHeight > 0
          ? naturalWidth / naturalHeight
          : undefined,
      );
    }

    function onError() {
      finish();
    }

    image.addEventListener('load', onLoad);
    image.addEventListener('error', onError);
    image.src = url;
  }).finally(() => pendingRatios.delete(url));

  pendingRatios.set(url, request);
  return request;
}

type SavedCarouselRatio = Pick<
  CarouselProperty,
  'aspectRatio' | 'aspectRatioSource'
>;

export function getSavedCarouselRatio(
  urls: string[],
  saved: SavedCarouselRatio,
) {
  const { aspectRatio, aspectRatioSource } = saved;
  if (
    typeof aspectRatio === 'number' &&
    Number.isFinite(aspectRatio) &&
    aspectRatio > 0 &&
    aspectRatioSource &&
    urls.includes(aspectRatioSource)
  ) {
    return { aspectRatio, aspectRatioSource };
  }
}

export async function resolveCarouselAspectRatio(
  urls: string[],
  saved: SavedCarouselRatio,
) {
  const savedRatio = getSavedCarouselRatio(urls, saved);
  for (const url of urls) {
    if (url === savedRatio?.aspectRatioSource) return savedRatio;
    const ratio = await readImageRatio(url);
    if (ratio) return { aspectRatio: ratio, aspectRatioSource: url };
  }
}

export async function prepareDiyCarouselRatios(property: string) {
  if (!property) return property;
  const page = JSON.parse(property) as null | PageConfig;
  const carousels = (page?.components ?? [])
    .filter(
      ({ id, property }) =>
        id === 'Carousel' && property?.heightMode === 'adaptive',
    )
    .map(({ property }) => property as CarouselProperty);
  if (carousels.length === 0) return property;

  await Promise.all(
    carousels.map(async (carousel) => {
      const dimensions = await resolveCarouselAspectRatio(
        getCarouselImageUrls(carousel.items),
        carousel,
      );
      carousel.aspectRatio = dimensions?.aspectRatio;
      carousel.aspectRatioSource = dimensions?.aspectRatioSource;
    }),
  );
  return JSON.stringify(page);
}
