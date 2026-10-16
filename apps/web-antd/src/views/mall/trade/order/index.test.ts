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

describe('trade order page layout', () => {
  it('keeps the summary and table inside the page content height', () => {
    expect(source).toMatch(
      /<Page\s+auto-content-height\s+content-class="flex flex-col overflow-hidden"\s*>/,
    );
    expect(source).toContain(
      '<Grid class="min-h-0 flex-1" table-title="订单列表">',
    );
  });

  it('does not make the table wait for the summary request', () => {
    expect(source).toMatch(
      /const requestId = \+\+summaryRequestId;\s+const pageResult = await getOrderPage\(/,
    );
    expect(source).toContain('const pageResult = await getOrderPage({');
    expect(source).toContain('void getOrderSummary(query)');
    expect(source).not.toContain(
      'const [pageResult, summaryResult] = await Promise.all([',
    );
  });
});
