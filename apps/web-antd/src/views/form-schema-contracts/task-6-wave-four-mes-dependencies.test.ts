import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { scanSource } from '../../../../../scripts/vsh/src/check-web-antd-contracts/scanner';

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    if (/\.(?:ts|vue)$/.test(entry.name)) return [target];
    return [];
  });
}

describe('task 6 MES dependency migration', () => {
  it('contains no legacy dependencies or invalid trigger fields', () => {
    const root = path.resolve(import.meta.dirname, '..', 'mes');
    const violations = sourceFiles(root).flatMap((file) =>
      scanSource(
        fs.readFileSync(file, 'utf8'),
        path.relative(process.cwd(), file),
      )
        .filter(({ ruleId }) => ['VF001', 'VF003'].includes(ruleId))
        .map(({ column, line, ruleId }) => `${ruleId}:${line}:${column}`),
    );
    expect(violations).toEqual([]);
  });
});
