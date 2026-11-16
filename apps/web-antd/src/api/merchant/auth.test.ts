import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loginMerchant, registerMerchant } from './auth';

const client = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  merchantBaseRequestClient: client,
  merchantRequestClient: client,
}));

describe('merchant auth API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers with the backend username, nickname, mobile and password fields', async () => {
    await registerMerchant({
      username: 'seller100',
      nickname: 'Tea Seller',
      mobile: '15601691300',
      password: 'secret123',
    });

    expect(client.post).toHaveBeenCalledWith('/system/auth/register', {
      username: 'seller100',
      nickname: 'Tea Seller',
      mobile: '15601691300',
      password: 'secret123',
    });
  });

  it('logs in with username and password', async () => {
    await loginMerchant({ username: 'seller100', password: 'secret123' });

    expect(client.post).toHaveBeenCalledWith(
      '/system/auth/login',
      { username: 'seller100', password: 'secret123' },
      { headers: { isEncrypt: false } },
    );
  });
});
