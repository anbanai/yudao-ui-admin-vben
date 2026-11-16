import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const appRoot = resolve(process.cwd(), 'apps/web-antd');
const preferencesSource = readFileSync(
  resolve(appRoot, 'src/preferences.ts'),
  'utf8',
);
const sharedAuthenticationSource = readFileSync(
  resolve(
    process.cwd(),
    'packages/effects/layouts/src/authentication/authentication.vue',
  ),
  'utf8',
);

describe('Tea Worth Share branding', () => {
  it('ships the compact logo asset', () => {
    expect(existsSync(resolve(appRoot, 'public/branding/logo-mark.png'))).toBe(
      true,
    );
  });

  it('uses the compact mark for the shared app chrome', () => {
    expect(preferencesSource).toContain("source: '/branding/logo-mark.png'");
  });

  it('keeps the original login showcase banner', () => {
    expect(sharedAuthenticationSource).toContain(
      '<SloganIcon v-else :alt="appName" class="h-64 w-2/5 animate-float" />',
    );
    expect(sharedAuthenticationSource).not.toContain('object-contain');
  });
});
