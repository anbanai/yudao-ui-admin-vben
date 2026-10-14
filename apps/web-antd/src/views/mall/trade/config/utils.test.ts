import { describe, expect, it } from 'vitest';

import { mergeTradeConfigFormValues, setTradeConfigTab } from './utils';

describe('trade config tab state', () => {
  it('ignores tab changes before the config has loaded', () => {
    expect(setTradeConfigTab(undefined, 'kefu')).toBeUndefined();
  });

  it('updates the loaded config with the active tab', () => {
    const config = { type: 'afterSale' };

    expect(setTradeConfigTab(config, 'kefu')).toEqual({ type: 'kefu' });
    expect(config).toEqual({ type: 'afterSale' });
  });

  it('preserves the loaded customer service image when the form omits it', () => {
    const imageUrl = 'https://static.example.com/kefu.jpg';

    expect(
      mergeTradeConfigFormValues(
        { kefuWechatQrCodeUrl: imageUrl },
        { type: 'kefu' },
      ),
    ).toMatchObject({
      kefuWechatQrCodeUrl: imageUrl,
      type: 'kefu',
    });
  });

  it('keeps an explicit empty customer service image so users can remove it', () => {
    const imageUrl = 'https://static.example.com/kefu.jpg';

    expect(
      mergeTradeConfigFormValues(
        { kefuWechatQrCodeUrl: imageUrl },
        { kefuWechatQrCodeUrl: '' },
      ).kefuWechatQrCodeUrl,
    ).toBe('');
  });
});
