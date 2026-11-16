import { describe, expect, it } from 'vitest';

import { getMerchantApiURL } from './merchant-client';

describe('getMerchantApiURL', () => {
  it('replaces the admin API context while preserving the gateway origin', () => {
    expect(getMerchantApiURL('https://api.example.test/admin-api')).toBe(
      'https://api.example.test/merchant-api',
    );
  });

  it('leaves a gateway URL without an API context intact and appends merchant-api', () => {
    expect(getMerchantApiURL('https://api.example.test')).toBe(
      'https://api.example.test/merchant-api',
    );
  });
});
