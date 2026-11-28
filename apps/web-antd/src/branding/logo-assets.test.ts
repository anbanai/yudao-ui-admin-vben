import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const appRoot = resolve(process.cwd(), 'apps/web-antd');
const configuredApps = [
  'web-antd',
  'web-antdv-next',
  'web-ele',
  'web-naive',
  'web-tdesign',
].map((app) => resolve(process.cwd(), 'apps', app));
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

  it('ships the complete brand assets for every admin app', () => {
    for (const app of configuredApps) {
      expect(existsSync(resolve(app, 'public/favicon.ico'))).toBe(true);
      expect(existsSync(resolve(app, 'public/branding/logo-mark.png'))).toBe(
        true,
      );
      expect(existsSync(resolve(app, 'public/branding/logo-full.png'))).toBe(
        true,
      );
    }
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
