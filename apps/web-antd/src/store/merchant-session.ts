import { acceptHMRUpdate, defineStore } from 'pinia';

interface MerchantSessionState {
  accessToken: null | string;
  refreshToken: null | string;
}

export const useMerchantSessionStore = defineStore('merchant-session', {
  actions: {
    setAccessToken(token: MerchantSessionState['accessToken']) {
      this.accessToken = token;
    },
    setRefreshToken(token: MerchantSessionState['refreshToken']) {
      this.refreshToken = token;
    },
  },
  persist: {
    pick: ['accessToken', 'refreshToken'],
  },
  state: (): MerchantSessionState => ({
    accessToken: null,
    refreshToken: null,
  }),
});

const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useMerchantSessionStore, hot));
}
