import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getMerchantUserPage,
  resetMerchantUserPassword,
  updateMerchantUserStatus,
} from './index';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock('#/api/request', () => ({ requestClient: client }));

describe('merchant user API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries merchant users with page filters', async () => {
    const params = {
      pageNo: 2,
      pageSize: 20,
      status: 1,
      username: 'seller',
    };

    await getMerchantUserPage(params);

    expect(client.get).toHaveBeenCalledWith('/system/merchant-user/page', {
      params,
    });
  });

  it('updates status through the request body', async () => {
    await updateMerchantUserStatus(12, 0);

    expect(client.put).toHaveBeenCalledWith(
      '/system/merchant-user/update-status',
      { id: 12, status: 0 },
    );
  });

  it('resets password with the request body', async () => {
    await resetMerchantUserPassword(12, 'newSecret');

    expect(client.put).toHaveBeenCalledWith(
      '/system/merchant-user/update-password',
      { id: 12, password: 'newSecret' },
    );
  });
});
