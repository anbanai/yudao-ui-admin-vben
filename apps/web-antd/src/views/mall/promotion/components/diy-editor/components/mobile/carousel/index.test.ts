import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'index.vue'),
  'utf8',
);

describe('Carousel fixed-height rendering', () => {
  it('keeps every carousel layer constrained by the configured height', () => {
    expect(source).toMatch(
      /v-for="\(item, index\) in property\.items"[\s\S]*:style="\{ height: `\$\{property\.height\}px`/,
    );
    expect(source).toMatch(/\.slick-list[\s\S]*height:\s*100%/);
    expect(source).toMatch(/\.slick-track[\s\S]*height:\s*100%/);
    expect(source).toMatch(/\.slick-slide[\s\S]*height:\s*100%/);
    expect(source).toMatch(/object-cover/);
  });
});
