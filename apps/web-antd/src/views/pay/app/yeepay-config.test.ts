import { describe, expect, it } from 'vitest';

import { PayChannelEnum } from '../../../../../../packages/constants/src/biz-pay-enum';
import {
  createYeepayChannelDefaults,
  createYeepayChannelFormSchema,
} from './yeepay-config';

describe('yeePay channel configuration', () => {
  it('exposes the aggregate mini-program channel alongside other channels', () => {
    expect(PayChannelEnum.YEEPAY_WX_LITE).toEqual({
      code: 'yeepay_wx_lite',
      name: '易宝微信小程序聚合支付',
    });
  });

  it('provides platform-level fields without merchant secrets', () => {
    const schema = createYeepayChannelFormSchema();
    const fieldNames = schema.map((field) => field.fieldName);

    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'config.appKeyRef',
        'config.privateKeyRef',
        'config.publicKeyRef',
        'config.parentMerchantNo',
        'config.collectionMerchantNo',
        'config.appId',
        'config.fundProcessType',
        'config.fullAmountDivideConfirmed',
        'config.feeBearerMode',
        'config.platformCertSerialNo',
        'config.connectTimeoutSeconds',
        'config.retryBackoffSeconds',
        'config.rateLimitPerSecond',
      ]),
    );
    expect(fieldNames).not.toContain('config.merchantNo');
    expect(fieldNames).not.toContain('config.privateKey');
  });

  it('uses safe production defaults and only shows conditional fields when relevant', () => {
    const defaults = createYeepayChannelDefaults();
    expect(defaults).toMatchObject({
      sdkEnv: 'prod',
      fundProcessType: 'DELAY_SETTLE',
      maxDivideRecipients: 5,
      fullAmountDivideConfirmed: false,
      connectTimeoutSeconds: 5,
      retryBackoffSeconds: 3,
      rateLimitPerSecond: 20,
    });

    const schema = createYeepayChannelFormSchema();
    const promotionField = schema.find(
      (field) => field.fieldName === 'config.feeSubsidyPromotionNo',
    );
    const certSerialField = schema.find(
      (field) => field.fieldName === 'config.platformCertSerialNo',
    );
    const promotionResolve = promotionField?.dependencies?.resolve;
    const certResolve = certSerialField?.dependencies?.resolve;
    const dependencyContext = (config: Record<string, string>) =>
      ({ values: { config } }) as unknown as Parameters<
        NonNullable<typeof promotionResolve>
      >[0];

    expect(
      promotionResolve?.(
        dependencyContext({ feeBearerMode: 'PLATFORM_FEE_ACCOUNT' }),
      ),
    ).toEqual({
      show: false,
    });
    expect(
      promotionResolve?.(
        dependencyContext({ feeBearerMode: 'FULL_SUBSIDY_PROMOTION' }),
      ),
    ).toEqual({
      show: true,
    });
    expect(
      certResolve?.(dependencyContext({ signingCertType: 'RSA2048' })),
    ).toEqual({
      show: false,
    });
    expect(
      certResolve?.(dependencyContext({ signingCertType: 'SM2' })),
    ).toEqual({
      show: true,
    });
  });
});
