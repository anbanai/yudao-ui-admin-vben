import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const componentsRoot = join(__dirname);

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? collectSourceFiles(path)
      : entry.name.endsWith('.vue')
        ? [path]
        : [];
  });
}

describe('mp component dependency boundaries', () => {
  it('does not import components through its own barrel', () => {
    const barrelImports = collectSourceFiles(componentsRoot).filter((file) =>
      readFileSync(file, 'utf8').includes("from '#/views/mp/components'"),
    );

    expect(barrelImports).toEqual([]);
  });
});
