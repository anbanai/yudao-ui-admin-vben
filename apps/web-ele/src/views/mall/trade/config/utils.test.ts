import { describe, expect, it } from 'vitest';

import { setTradeConfigTab } from './utils';

describe('trade config tab state', () => {
  it('ignores tab changes before the config has loaded', () => {
    expect(setTradeConfigTab(undefined, 'kefu')).toBeUndefined();
  });

  it('updates the loaded config with the active tab', () => {
    const config = { type: 'afterSale' };

    expect(setTradeConfigTab(config, 'kefu')).toEqual({ type: 'kefu' });
    expect(config).toEqual({ type: 'afterSale' });
  });
});
