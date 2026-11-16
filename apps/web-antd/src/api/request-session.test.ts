import type { RequestClient } from '@vben/request';

import { describe, expect, it, vi } from 'vitest';

import {
  assertCurrentRequestSession,
  bindRequestToSession,
  sessionAuthenticationInterceptor,
} from './request-session';

describe('request session isolation', () => {
  function setup() {
    let version = 1;
    const client = {
      isRefreshing: false,
      refreshTokenQueue: [],
      request: vi.fn().mockResolvedValue('retried'),
    };
    const options = {
      client: client as unknown as RequestClient,
      doReAuthenticate: vi.fn().mockResolvedValue(undefined),
      doRefreshToken: vi.fn().mockResolvedValue('new-token'),
      enableRefreshToken: true,
      formatToken: (token: string) => `Bearer ${token}`,
      getSessionVersion: () => version,
    };
    const error = {
      config: { __sessionVersion: 1, headers: {}, url: '/orders' },
      response: { status: 401 },
    };
    return {
      error,
      interceptor: sessionAuthenticationInterceptor(options),
      nextSession: () => version++,
      options,
    };
  }

  it('rejects queued retries and successful responses from an old login', () => {
    const config = {};
    bindRequestToSession(config, 1);
    expect(() => bindRequestToSession(config, 2)).toThrow(/session changed/);
    expect(() => assertCurrentRequestSession(config, 2)).toThrow(
      /session changed/,
    );
  });

  it('does not refresh or log out a new session for an old unauthorized response', async () => {
    const { error, interceptor, nextSession, options } = setup();
    nextSession();
    await expect(interceptor.rejected!(error)).rejects.toThrow(
      /session changed/,
    );
    expect(options.doRefreshToken).not.toHaveBeenCalled();
    expect(options.doReAuthenticate).not.toHaveBeenCalled();
  });

  it('does not log out or replay a request when the session changes during refresh', async () => {
    const { error, interceptor, nextSession, options } = setup();
    options.doRefreshToken.mockImplementation(async () => {
      nextSession();
      return 'old-session-token';
    });
    await expect(interceptor.rejected!(error)).rejects.toThrow(
      /session changed/,
    );
    expect(options.doReAuthenticate).not.toHaveBeenCalled();
    expect(options.client.request).not.toHaveBeenCalled();
  });

  it('refreshes and retries an expired token within the same session', async () => {
    const { error, interceptor, options } = setup();
    await expect(interceptor.rejected!(error)).resolves.toBe('retried');
    expect(options.doRefreshToken).toHaveBeenCalledOnce();
    expect(options.client.request).toHaveBeenCalledOnce();
    expect(options.doReAuthenticate).not.toHaveBeenCalled();
  });
});
