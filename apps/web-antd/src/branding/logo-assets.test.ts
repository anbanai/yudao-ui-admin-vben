import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const appRoot = resolve(process.cwd(), 'apps/web-antd');
const preferencesSource = readFileSync(
  resolve(appRoot, 'src/preferences.ts'),
  'utf8',
);
const authLayoutSource = readFileSync(
  resolve(appRoot, 'src/layouts/auth.vue'),
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
  it('ships the compact and full logo assets', () => {
    expect(existsSync(resolve(appRoot, 'public/branding/logo-mark.png'))).toBe(
      true,
    );
    expect(existsSync(resolve(appRoot, 'public/branding/logo-full.png'))).toBe(
      true,
    );
  });

  it('uses the compact mark for the shared app chrome', () => {
    expect(preferencesSource).toContain("source: '/branding/logo-mark.png'");
  });

  it('uses the full lockup in the login showcase without stretching it', () => {
    expect(authLayoutSource).toContain(
      ':slogan-image="\'/branding/logo-full.png\'"',
    );
    expect(sharedAuthenticationSource).toMatch(
      /:src="sloganImage"[\s\S]*class="h-64 w-2\/5 object-contain animate-float"/,
    );
  });
});
