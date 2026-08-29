import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const basicLayout = readFileSync(
  resolve(process.cwd(), 'apps/web-antd/src/layouts/basic.vue'),
  'utf8',
);

describe('basic layout user menu', () => {
  it('does not expose technical resources in the user menu', () => {
    expect(basicLayout).toContain("text: $t('ui.widgets.profile')");
    expect(basicLayout).not.toContain('VBEN_DOC_URL');
    expect(basicLayout).not.toContain('VBEN_GITHUB_URL');
    expect(basicLayout).not.toContain("text: 'GitHub'");
    expect(basicLayout).not.toContain("$t('ui.widgets.document')");
    expect(basicLayout).not.toContain("$t('ui.widgets.qa')");
    expect(basicLayout).not.toContain('<HelpModal />');
  });
});
