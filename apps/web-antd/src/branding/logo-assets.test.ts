import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const appRoot = resolve(process.cwd(), 'apps/web-antd');
const antvNextRoot = resolve(process.cwd(), 'apps/web-antdv-next');
const preferencesSource = readFileSync(
  resolve(appRoot, 'src/preferences.ts'),
  'utf8',
);
const authenticationSource = readFileSync(
  resolve(appRoot, 'src/layouts/auth.vue'),
  'utf8',
);

describe('好茶引力品牌资源', () => {
  it('ships the compact logo asset', () => {
    expect(existsSync(resolve(appRoot, 'public/branding/logo-mark.png'))).toBe(
      true,
    );
  });

  it('ships the branded browser icon for both configured admin apps', () => {
    expect(existsSync(resolve(appRoot, 'public/favicon.ico'))).toBe(true);
    expect(existsSync(resolve(antvNextRoot, 'public/favicon.ico'))).toBe(true);
  });

  it('uses the compact mark for the shared app chrome', () => {
    expect(preferencesSource).toContain("source: '/branding/logo-mark.png'");
  });

  it('uses the full logo in the login showcase', () => {
    expect(existsSync(resolve(appRoot, 'public/branding/logo-full.png'))).toBe(
      true,
    );
    expect(authenticationSource).toContain(
      'slogan-image="/branding/logo-full.png"',
    );
  });
});
