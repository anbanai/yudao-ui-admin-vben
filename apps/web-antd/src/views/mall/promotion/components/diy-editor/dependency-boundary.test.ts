import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const diyEditorRoot = join(__dirname);

function collectVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? collectVueFiles(path)
      : entry.name.endsWith('.vue')
        ? [path]
        : [];
  });
}

describe('diy-editor dependency boundaries', () => {
  it('does not import components through the promotion barrel', () => {
    const barrelImports = collectVueFiles(diyEditorRoot).filter((file) =>
      readFileSync(file, 'utf8').includes(
        "from '#/views/mall/promotion/components'",
      ),
    );

    expect(barrelImports).toEqual([]);
  });

  it('keeps page shell config types independent from util', () => {
    const configFiles = [
      'components/mobile/navigation-bar/config.ts',
      'components/mobile/page-config/config.ts',
      'components/mobile/tab-bar/config.ts',
    ];
    const utilImports = configFiles.filter((file) =>
      readFileSync(join(diyEditorRoot, file), 'utf8').includes(
        "from '../../../util'",
      ),
    );

    expect(utilImports).toEqual([]);
  });
});
