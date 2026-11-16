import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(
    process.cwd(),
    `.${decodeURIComponent(new URL('index.vue', import.meta.url).pathname)}`,
  ),
  'utf8',
);

describe('商品列表推广入口', () => {
  it('连接推广弹窗并限制为出售中商品', () => {
    expect(source).toContain(
      "import PromotionModal from './modules/promotion-modal.vue'",
    );
    expect(source).toContain('connectedComponent: PromotionModal');
    expect(source).toContain("label: '推广'");
    expect(source).toContain("icon: 'lucide:share-2'");
    expect(source).toMatch(
      /ifShow:\s*\(\) =>\s*tabType === 0[\s\S]*row\.status === ProductSpuStatusEnum\.ENABLE\.status/,
    );
    expect(source).toContain('promotionModalApi.setData(row).open()');
  });
});
