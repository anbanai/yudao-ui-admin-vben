# Product Promotion Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-list promotion workflow for active mall products that generates downloadable poster, card, and H5 QR images plus a copyable tracked link, with optional promoter attribution.

**Architecture:** Keep orchestration in a Vben modal, isolate URL/tracking construction in pure functions, and isolate browser Canvas work behind a renderer interface. Reuse the existing product/member APIs, call the existing public App small-program-code endpoint through the current request client, and generate all files in browser memory.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, Vben modal/table adapters, Vitest with happy-dom, native Canvas 2D, `qrcode` 1.5.x, pnpm 11.

**Spec:** `docs/superpowers/specs/2026-09-19-product-promotion-entry-design.md`

## Global Constraints

- Product and UI changes are restricted to `apps/web-antd`; do not touch another app directory.
- Use Node.js 22.18+ (or Node 24) and pnpm 11+; do not use npm or yarn.
- Show the entry only in the `出售中` tab and revalidate `status === ProductSpuStatusEnum.ENABLE.status` after loading details.
- Public promotion uses `shareId=0`, `VITE_APP_TITLE`, and `/branding/logo-mark.png`.
- Small-program assets use `pages/index/index` with `spm={shareId}.2.{spuId}.3.2`.
- H5 assets and links use `VITE_MALL_H5_DOMAIN` with `spm={shareId}.2.{spuId}.1.3`.
- Output sizes are 600 x 1000 (poster), 1000 x 800 (card), and 800 x 800 (H5 QR).
- Generated images stay in browser memory and are never uploaded or persisted.
- Preserve all dirty-worktree changes. `apps/web-antd/src/views/mall/product/spu/index.vue`, `data.ts`, the SPU API, and `modules/inventory-form.vue` already contain user-owned batch/inventory work.
- Before every commit, inspect `git diff --cached --name-only`. Never stage an overlapping user-owned file merely to complete a commit step.

## File Map

- Create `apps/web-antd/src/views/mall/product/spu/promotion-share.ts` and `.test.ts`: identities, tracking, URLs, prices, names, and cache keys.
- Create `apps/web-antd/src/api/member/social/index.ts` and `.test.ts`: small-program QR API wrapper.
- Create `apps/web-antd/src/views/mall/product/spu/promotion-renderer.ts` and `.test.ts`: image loading, text layout, QR generation, and Canvas export.
- Modify `apps/web-antd/package.json` and `pnpm-lock.yaml`: direct `qrcode` dependency.
- Create `apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.vue` and `.test.ts`: debounced member lookup.
- Create `apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.vue` and `.test.ts`: promotion workflow UI.
- Modify `apps/web-antd/src/views/mall/product/spu/index.vue`: preserve current work and connect the new modal/action.
- Create `apps/web-antd/src/views/mall/product/spu/promotion-entry.test.ts`: list integration contract.

---

### Task 1: Promotion Data Contract and Tracking Helpers

**Files:**
- Create: `apps/web-antd/src/views/mall/product/spu/promotion-share.ts`
- Test: `apps/web-antd/src/views/mall/product/spu/promotion-share.test.ts`

**Interfaces:**
- Consumes: `MallSpuApi.Spu`, `MemberUserApi.User`.
- Produces: `PromotionIdentity`, `PromotionContext`, `PromotionAssetType`, `createShopIdentity()`, `createMemberIdentity()`, `buildPromotionContext()`, `buildSpm()`, `buildPromotionCacheKey()`, `buildPromotionFilename()`.

- [ ] **Step 1: Write failing identity and channel tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildPromotionContext,
  createMemberIdentity,
  createShopIdentity,
} from './promotion-share';

describe('商品推广数据', () => {
  it('使用公共店铺身份', () => {
    expect(createShopIdentity('不忍独享', '/branding/logo-mark.png')).toEqual({
      avatarUrl: '/branding/logo-mark.png',
      kind: 'shop',
      name: '不忍独享',
      shareId: 0,
    });
  });

  it('为资料不全的推广员提供兜底', () => {
    expect(
      createMemberIdentity({ id: 27, nickname: '', avatar: '' }, '/branding/logo-mark.png'),
    ).toEqual({
      avatarUrl: '/branding/logo-mark.png',
      kind: 'member',
      name: '会员 27',
      shareId: 27,
    });
  });

  it('生成一致的小程序和 H5 追踪参数', () => {
    const context = buildPromotionContext({
      h5Domain: 'https://mall.example.com/store?tenant=tea',
      identity: createShopIdentity('不忍独享', '/branding/logo-mark.png'),
      product: {
        id: 88,
        marketPrice: 12900,
        name: '明前绿茶',
        picUrl: 'https://static.example.com/tea.png',
        price: 9900,
      },
    });
    expect(context.miniProgramScene).toBe('spm=0.2.88.3.2');
    expect(context.h5Url).toBe(
      'https://mall.example.com/store?tenant=tea&spm=0.2.88.1.3',
    );
    expect(context.priceText).toBe('¥99.00');
    expect(context.marketPriceText).toBe('¥129.00');
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/promotion-share.test.ts
```

Expected: FAIL because `./promotion-share` does not exist.

- [ ] **Step 3: Add invalid-input, cache-key, and filename tests**

```ts
it('拒绝缺少商品编号或无效 H5 域名', () => {
  expect(() => buildPromotionContext({
    h5Domain: 'not-a-url',
    identity: createShopIdentity('店铺', '/branding/logo-mark.png'),
    product: { name: '测试商品' },
  })).toThrow('商品编号不存在');
});

it('身份或素材类型变化时缓存键变化', () => {
  const product = { id: 8, name: '茶', picUrl: '/tea.png', price: 100 };
  expect(buildPromotionCacheKey(product, 0, 'poster')).not.toBe(
    buildPromotionCacheKey(product, 9, 'poster'),
  );
  expect(buildPromotionCacheKey(product, 0, 'poster')).not.toBe(
    buildPromotionCacheKey(product, 0, 'card'),
  );
});

it('清理下载文件名非法字符', () => {
  expect(buildPromotionFilename('春茶/礼盒:*?', 'poster')).toBe(
    '春茶-礼盒---商品海报.png',
  );
});
```

- [ ] **Step 4: Implement the typed pure helpers**

```ts
export type PromotionAssetType = 'card' | 'h5' | 'poster';

export interface PromotionIdentity {
  avatarUrl: string;
  kind: 'member' | 'shop';
  name: string;
  shareId: number;
}

export interface PromotionContext {
  h5Url: string;
  identity: PromotionIdentity;
  marketPriceText?: string;
  miniProgramPath: 'pages/index/index';
  miniProgramScene: string;
  picUrl: string;
  priceText: string;
  productId: number;
  productName: string;
}

const CHANNELS = {
  h5: { from: 3, platform: 1 },
  miniProgram: { from: 2, platform: 3 },
} as const;

export function buildSpm(
  shareId: number,
  spuId: number,
  channel: keyof typeof CHANNELS,
) {
  const { from, platform } = CHANNELS[channel];
  return `spm=${shareId}.2.${spuId}.${platform}.${from}`;
}
```

Use `new URL()` plus `searchParams.set('spm', valueWithoutPrefix)` for H5. Require product ID, name, image, current price, and a valid H5 domain. Format fen with two decimals. Omit market price unless it is greater than the current price.

- [ ] **Step 5: Run tests and commit only the isolated files**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/promotion-share.test.ts
git add apps/web-antd/src/views/mall/product/spu/promotion-share.ts apps/web-antd/src/views/mall/product/spu/promotion-share.test.ts
git diff --cached --name-only
git commit -m "feat(mall): add product promotion share helpers"
```

Expected: tests PASS; exactly two staged paths before commit.

---

### Task 2: Small-Program QR Code API Adapter

**Files:**
- Create: `apps/web-antd/src/api/member/social/index.ts`
- Test: `apps/web-antd/src/api/member/social/index.test.ts`

**Interfaces:**
- Consumes: `requestClient`, `VITE_BASE_URL`, and the mini-program scene.
- Produces: `getWxaQrcode(request): Promise<string>` returning a data URL.

- [ ] **Step 1: Write the failing endpoint test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
const requestMocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: { post: requestMocks.post } }));
import { getWxaQrcode } from './index';

describe('小程序码 API', () => {
  beforeEach(() => requestMocks.post.mockReset());
  it('调用 App API 并规范化 base64', async () => {
    requestMocks.post.mockResolvedValue('iVBORw0KGgoAAA');
    await expect(getWxaQrcode({
      path: 'pages/index/index',
      scene: 'spm=0.2.88.3.2',
      width: 280,
    })).resolves.toBe('data:image/png;base64,iVBORw0KGgoAAA');
    expect(requestMocks.post).toHaveBeenCalledWith(
      `${import.meta.env.VITE_BASE_URL}/app-api/member/social-user/wxa-qrcode`,
      {
        autoColor: true,
        checkPath: false,
        hyaline: false,
        path: 'pages/index/index',
        scene: 'spm=0.2.88.3.2',
        width: 280,
      },
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

```bash
pnpm exec vitest run apps/web-antd/src/api/member/social/index.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the wrapper with the existing request client**

```ts
import { requestClient } from '#/api/request';

export namespace MemberSocialApi {
  export interface WxaQrcodeRequest {
    path: string;
    scene: string;
    width?: number;
  }
}

export async function getWxaQrcode(
  data: MemberSocialApi.WxaQrcodeRequest,
): Promise<string> {
  const base64 = await requestClient.post<string>(
    `${import.meta.env.VITE_BASE_URL}/app-api/member/social-user/wxa-qrcode`,
    { autoColor: true, checkPath: false, hyaline: false, width: 280, ...data },
  );
  return `data:image/png;base64,${base64}`;
}
```

Do not create another Axios instance; the current client already supplies tenant headers and business-error handling.

- [ ] **Step 4: Run tests and commit the isolated API files**

```bash
pnpm exec vitest run apps/web-antd/src/api/member/social/index.test.ts
git add apps/web-antd/src/api/member/social/index.ts apps/web-antd/src/api/member/social/index.test.ts
git diff --cached --name-only
git commit -m "feat(web-antd): add mini program QR code API"
```

Expected: PASS; exactly two staged paths.

---

### Task 3: Canvas Promotion Renderer

**Files:**
- Create: `apps/web-antd/src/views/mall/product/spu/promotion-renderer.ts`
- Test: `apps/web-antd/src/views/mall/product/spu/promotion-renderer.test.ts`
- Modify: `apps/web-antd/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `PromotionAssetType`, `PromotionContext`, and a small-program QR data URL.
- Produces: `PromotionRenderInput`, `PromotionRenderDependencies`, `renderPromotionAsset()`, `wrapCanvasText()`, `PROMOTION_ASSET_SIZES`.

- [ ] **Step 1: Write failing layout tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { PROMOTION_ASSET_SIZES, wrapCanvasText } from './promotion-renderer';

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
    const lines = wrapCanvasText('这是一段很长的商品名称用于测试截断', 80, 2, measure);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
  });
});
```

- [ ] **Step 2: Confirm the test fails, then declare dependencies**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/promotion-renderer.test.ts
```

Add `"qrcode": "catalog:"` to app dependencies and `"@types/qrcode": "catalog:"` to app devDependencies, then run:

```bash
pnpm install --lockfile-only
```

Expected: only the `apps/web-antd` importer changes in the lockfile.

- [ ] **Step 3: Implement injectable browser primitives**

```ts
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
```

Default image loading sets `crossOrigin='anonymous'` before `src`, times out after 10 seconds, and removes handlers after settle. Default QR generation uses `QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width })`.

- [ ] **Step 4: Add fake-Canvas behavior tests**

Create a fake 2D context recording drawing calls and a fake Canvas whose `toBlob` returns `new Blob(['png'], { type: 'image/png' })`. Test all sizes and QR requirements:

```ts
it.each([
  ['poster', 600, 1000],
  ['card', 1000, 800],
  ['h5', 800, 800],
] as const)('renders %s at %sx%s', async (type, width, height) => {
  const { deps, lastCanvas } = createFakeRenderDependencies();
  const blob = await renderPromotionAsset({
    context: promotionContext,
    miniProgramQrCode: type === 'h5' ? undefined : 'data:image/png;base64,qr',
    type,
  }, deps);
  expect(lastCanvas()).toMatchObject({ height, width });
  expect(blob.type).toBe('image/png');
});
```

Also prove poster/card reject without `miniProgramQrCode`, H5 generates its own QR, avatar load failure retries with the shop logo, and a null Blob rejects with `推广图片导出失败`.

- [ ] **Step 5: Implement deterministic layouts**

Use private `drawPoster()`, `drawCard()`, `drawH5QrImage()`, and shared `drawCoverImage()` functions. Every layout paints an opaque white background, center-crops the product image, draws at most two title lines, uses fixed price/QR coordinates, and conditionally draws market price. Poster/card show identity and small-program QR; H5 uses `context.h5Url` for its QR.

```ts
export async function renderPromotionAsset(
  input: PromotionRenderInput,
  dependencies: PromotionRenderDependencies = browserDependencies,
): Promise<Blob> {
  const size = PROMOTION_ASSET_SIZES[input.type];
  const canvas = dependencies.createCanvas(size.width, size.height);
  const context2d = canvas.getContext('2d');
  if (!context2d) throw new Error('当前浏览器不支持图片生成');
  if (input.type === 'poster') await drawPoster(context2d, input, dependencies);
  else if (input.type === 'card') await drawCard(context2d, input, dependencies);
  else await drawH5QrImage(context2d, input, dependencies);
  return canvasToPngBlob(canvas);
}
```

- [ ] **Step 6: Run tests and commit if package files were initially clean**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/promotion-renderer.test.ts apps/web-antd/src/views/mall/product/spu/promotion-share.test.ts
git add apps/web-antd/package.json pnpm-lock.yaml apps/web-antd/src/views/mall/product/spu/promotion-renderer.ts apps/web-antd/src/views/mall/product/spu/promotion-renderer.test.ts
git diff --cached --name-only
git commit -m "feat(mall): render product promotion images"
```

Expected: tests PASS and exactly four staged paths. If either package file had prior user changes, do not stage or commit this task.

---

### Task 4: Searchable Promotion-Member Selector

**Files:**
- Create: `apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.vue`
- Test: `apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.test.ts`

**Interfaces:**
- Consumes: `getUserPage()` and `MemberUserApi.User`.
- Produces: `modelValue?: number` and `change: [member?: MemberUserApi.User]`.

- [ ] **Step 1: Write a failing search test**

```ts
const apiMocks = vi.hoisted(() => ({ getUserPage: vi.fn() }));
vi.mock('#/api/member/user', () => ({ getUserPage: apiMocks.getUserPage }));

it('搜索昵称并展示手机号末四位', async () => {
  apiMocks.getUserPage.mockResolvedValue({
    list: [{ id: 9, mobile: '13800001234', nickname: '茶友' }],
    total: 1,
  });
  const { app, host, vm } = mountMemberSelect();
  vm.search('茶友');
  await new Promise((resolve) => setTimeout(resolve, 350));
  await nextTick();
  expect(apiMocks.getUserPage).toHaveBeenCalledWith({
    nickname: '茶友', pageNo: 1, pageSize: 20,
  });
  expect(host.textContent).toContain('茶友');
  expect(host.textContent).toContain('1234');
  app.unmount();
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.test.ts
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the async selector**

Use Ant Design Vue `Select`, `Avatar`, and `Spin` with `show-search`, `allow-clear`, `filter-option="false"`, and full width. Use `useDebounceFn(searchMembers, 300)`. Search all-digit input as `mobile`; otherwise search `nickname`:

```ts
function buildSearchParams(keyword: string) {
  const value = keyword.trim();
  return {
    pageNo: 1,
    pageSize: 20,
    ...(value && /^\d+$/.test(value)
      ? { mobile: value }
      : value ? { nickname: value } : {}),
  };
}
```

Cache members in `Map<number, MemberUserApi.User>`. Emit the ID and full member. Display `昵称或会员编号 · 手机尾号 1234`. Expose `search()` for tests. Use an incrementing request ID so an older response cannot replace newer options.

- [ ] **Step 4: Add numeric-search, clear, and race tests; run and commit**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.test.ts
git add apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.vue apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.test.ts
git diff --cached --name-only
git commit -m "feat(mall): add promotion member selector"
```

Expected: PASS and exactly two staged paths.

---

### Task 5: Promotion Modal

**Files:**
- Create: `apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.vue`
- Test: `apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.test.ts`

**Interfaces:**
- Consumes: `getSpu()`, `getWxaQrcode()`, `useAccess()`, Task 1 helpers, Task 3 renderer, Task 4 selector.
- Produces: a connected Vben modal accepting a `MallSpuApi.Spu` row through `modalApi.getData()`.

- [ ] **Step 1: Write a failing orchestration test**

Mock APIs/renderer and capture the `useVbenModal` config:

```ts
it('打开时重新读取商品并使用最新数据', async () => {
  mocks.getSpu.mockResolvedValue({
    id: 88, marketPrice: 12900, name: '最新商品名',
    picUrl: 'https://static.example.com/tea.png', price: 9900, status: 1,
  });
  modalApiMock.getData.mockReturnValue({ id: 88, name: '旧商品名' });
  mountPromotionModal();
  await mocks.modalConfig!.onOpenChange(true);
  await flushVueUpdates();
  expect(mocks.getSpu).toHaveBeenCalledWith(88);
  expect(host.textContent).toContain('最新商品名');
  expect(mocks.getWxaQrcode).toHaveBeenCalledWith(
    expect.objectContaining({ scene: 'spm=0.2.88.3.2' }),
  );
});
```

Mock `useVbenModal` with a Modal rendering its slot and API spies for `getData`, `lock`, `unlock`, and `close`. Mock `useAccess()` with configurable permission results.

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.test.ts
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement lifecycle and preview state**

```ts
type PreviewState =
  | { status: 'error'; message: string }
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; blob: Blob; url: string };

const activeTab = ref<'card' | 'h5' | 'link' | 'poster'>('poster');
const identityMode = ref<'member' | 'shop'>('shop');
const selectedMember = ref<MemberUserApi.User>();
const assetCache = new Map<string, Blob>();
const previewStates = reactive<Record<PromotionAssetType, PreviewState>>({
  card: { status: 'idle' }, h5: { status: 'idle' }, poster: { status: 'idle' },
});
```

On open, reset and revoke prior URLs, read row ID, lock, call `getSpu(id)`, require active status, build public context, unlock, and lazily generate only the current image tab. Cache each successful Blob under `buildPromotionCacheKey(product, shareId, type)` and cache the small-program QR per current scene. On close or identity change, revoke every ready URL and clear both caches before invalidating previews. Guard each async generation with a request ID so stale results are discarded and their new object URL is revoked.

Parse `VITE_MALL_H5_DOMAIN` before generation. When it is missing or invalid, keep poster/card available, disable the H5 and link tabs, and render `请配置 VITE_MALL_H5_DOMAIN` beside the disabled options.

- [ ] **Step 4: Implement the responsive UI**

Use `Modal` with `class="w-[960px]"`, `:footer="false"`, title `商品推广`. Add:

1. A compact 56px product summary with current and struck-through market prices.
2. `Segmented` for `店铺公共` and, only with `member:user:query`, `指定推广员`.
3. `PromotionMemberSelect` in member mode.
4. Tabs for `商品海报`, `商品卡片`, `H5 二维码`, and `推广链接`.
5. Stable aspect-ratio preview areas with loading/error/retry/ready states.
6. `下载 PNG`, `复制链接`, and `打开预览` commands with Lucide icons.

Use an unframed two-column layout above 900px and vertical layout below it. Do not nest decorative cards.

- [ ] **Step 5: Implement download, copy, and preview actions**

```ts
function downloadAsset(type: PromotionAssetType) {
  const state = previewStates[type];
  if (state.status !== 'ready' || !product.value) return;
  const anchor = document.createElement('a');
  anchor.href = state.url;
  anchor.download = buildPromotionFilename(product.value.name ?? '商品', type);
  anchor.click();
}
```

Use `navigator.clipboard.writeText()` first. On failure, select the readonly link input and show `请手动复制推广链接`; do not use `document.execCommand`. Open previews with `window.open(url, '_blank', 'noopener,noreferrer')`.

- [ ] **Step 6: Add failure, permission, invalidation, and cleanup tests**

Prove inactive latest products block generation; missing member permission hides that mode; member 27 changes both scenes; identity changes revoke old URLs and clear cached Blobs; repeated access reuses the keyed Blob; QR failure affects poster/card but not H5/link; invalid H5 configuration disables only H5/link; closing revokes every URL; and download filenames match each asset type.

- [ ] **Step 7: Run the promotion suite and commit the modal files**

```bash
pnpm exec vitest run apps/web-antd/src/api/member/social/index.test.ts apps/web-antd/src/views/mall/product/spu/promotion-share.test.ts apps/web-antd/src/views/mall/product/spu/promotion-renderer.test.ts apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.test.ts apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.test.ts
git add apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.vue apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.test.ts
git diff --cached --name-only
git commit -m "feat(mall): add product promotion modal"
```

Expected: all tests PASS; exactly two staged paths.

---

### Task 6: Product-List Integration and Verification

**Files:**
- Modify: `apps/web-antd/src/views/mall/product/spu/index.vue`
- Create: `apps/web-antd/src/views/mall/product/spu/promotion-entry.test.ts`

**Interfaces:**
- Consumes: Task 5 `PromotionModal` and current product-list row/tab data.
- Produces: active-product-only `推广` row action.

- [ ] **Step 1: Review the current overlapping diff before editing**

```bash
git diff -- apps/web-antd/src/views/mall/product/spu/index.vue
```

Expected: existing batch status and inventory work remains visible. Preserve it completely.

- [ ] **Step 2: Write a failing integration contract test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8');

describe('商品列表推广入口', () => {
  it('连接推广弹窗并限制为出售中商品', () => {
    expect(source).toContain("import PromotionModal from './modules/promotion-modal.vue'");
    expect(source).toContain('connectedComponent: PromotionModal');
    expect(source).toContain("label: '推广'");
    expect(source).toContain("icon: 'lucide:share-2'");
    expect(source).toMatch(
      /ifShow:\s*\(\) =>\s*tabType === 0[\s\S]*row\.status === ProductSpuStatusEnum\.ENABLE\.status/,
    );
    expect(source).toContain('promotionModalApi.setData(row).open()');
  });
});
```

- [ ] **Step 3: Run and confirm failure**

```bash
pnpm exec vitest run apps/web-antd/src/views/mall/product/spu/promotion-entry.test.ts
```

Expected: FAIL because the action is not wired.

- [ ] **Step 4: Wire the modal without disturbing current work**

```ts
import PromotionModal from './modules/promotion-modal.vue';

const [PromotionFormModal, promotionModalApi] = useVbenModal({
  connectedComponent: PromotionModal,
  destroyOnClose: true,
});

function handlePromotion(row: MallSpuApi.Spu) {
  promotionModalApi.setData(row).open();
}
```

Render `<PromotionFormModal />` next to the existing inventory modal. Add this action after `库存` and before `详情`:

```ts
{
  label: '推广',
  type: 'link',
  icon: 'lucide:share-2',
  auth: ['product:spu:query'],
  ifShow: () =>
    tabType === 0 && row.status === ProductSpuStatusEnum.ENABLE.status,
  onClick: handlePromotion.bind(null, row),
},
```

Vue unwraps `tabType` in templates; do not write `tabType.value` there.

- [ ] **Step 5: Run focused and neighboring tests**

```bash
pnpm exec vitest run \
  apps/web-antd/src/api/member/social/index.test.ts \
  apps/web-antd/src/views/mall/product/spu/promotion-share.test.ts \
  apps/web-antd/src/views/mall/product/spu/promotion-renderer.test.ts \
  apps/web-antd/src/views/mall/product/spu/modules/promotion-member-select.test.ts \
  apps/web-antd/src/views/mall/product/spu/modules/promotion-modal.test.ts \
  apps/web-antd/src/views/mall/product/spu/promotion-entry.test.ts \
  apps/web-antd/src/views/mall/product/spu/batch-actions.test.ts \
  apps/web-antd/src/views/mall/product/spu/inventory-utils.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Run type and build verification**

```bash
pnpm --filter @vben/web-antd typecheck
pnpm build:antd
```

Expected: both exit 0. Report exact unrelated pre-existing errors rather than changing unrelated code.

- [ ] **Step 7: Start the dev server and perform visual QA**

```bash
pnpm dev:antd
```

At 1440 x 900 and 1024 x 768, verify nonblank previews, exact output pixel sizes, scannable QR codes, stable loading/error dimensions, responsive stacking, and no overlap. Save Playwright screenshots outside git. If live authentication is unavailable, mount the modal with mocked APIs in a temporary harness and explicitly report that live API scanning was not verified.

- [ ] **Step 8: Preserve the overlapping product-list work**

```bash
git diff -- apps/web-antd/src/views/mall/product/spu/index.vue
git diff --cached --name-only
```

Do not stage `index.vue` while it contains the user's pre-existing batch/inventory changes. The new contract test may be committed alone:

```bash
git add apps/web-antd/src/views/mall/product/spu/promotion-entry.test.ts
git diff --cached --name-only
git commit -m "test(mall): cover product promotion entry"
```

Report that the integration edit remains uncommitted alongside the user's existing changes.

- [ ] **Step 9: Final review and evidence check**

```bash
git status --short
git diff --check
git diff --stat
```

Invoke `superpowers:requesting-code-review`, apply verified findings, rerun affected checks, then invoke `superpowers:verification-before-completion` before claiming success. Review tracking values, Blob URL cleanup, async races, Canvas CORS failures, and preservation of existing product-list work.
