import type { ResponseInterceptorConfig } from '@vben/request';

import { authenticateResponseInterceptor, CanceledError } from '@vben/request';

interface SessionRequestConfig {
  __sessionVersion?: number;
}

export function assertCurrentRequestSession(
  config: object | undefined,
  sessionVersion: number,
) {
  if (
    (config as SessionRequestConfig)?.__sessionVersion !== undefined &&
    (config as SessionRequestConfig).__sessionVersion !== sessionVersion
  ) {
    throw new CanceledError('The login session changed during this request');
  }
}

export function bindRequestToSession(config: object, sessionVersion: number) {
  // Retries keep the original session, so queued writes cannot use a new login.
  assertCurrentRequestSession(config, sessionVersion);
  (config as SessionRequestConfig).__sessionVersion = sessionVersion;
}

export function sessionAuthenticationInterceptor(
  options: Parameters<typeof authenticateResponseInterceptor>[0] & {
    getSessionVersion: () => number;
  },
): ResponseInterceptorConfig {
  return {
    rejected: async (error) => {
      const version = options.getSessionVersion();
      assertCurrentRequestSession(error.config, version);
      const interceptor = authenticateResponseInterceptor({
        ...options,
        doReAuthenticate: async () => {
          if (options.getSessionVersion() === version) {
            await options.doReAuthenticate();
          }
        },
        doRefreshToken: async () => {
          const token = await options.doRefreshToken();
          assertCurrentRequestSession(
            { __sessionVersion: version },
            options.getSessionVersion(),
          );
          return token;
        },
      });
      return interceptor.rejected!(error);
    },
  };
}
