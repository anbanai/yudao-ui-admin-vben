import type { VbenFormSchema } from '#/adapter/form';

/**
 * 易宝渠道只保存平台级配置和密钥引用。
 * 私钥、公钥、证书正文以及商家子商户资料均不应从后台表单提交。
 */
export function createYeepayChannelFormSchema(): VbenFormSchema[] {
  return [
    {
      label: 'AppKey 引用',
      fieldName: 'config.appKeyRef',
      component: 'Input',
      rules: 'required',
      help: '填写 env:// 或 sys:// 引用，例如 env://YEEPAY_APP_KEY。',
      componentProps: { placeholder: 'env://YEEPAY_APP_KEY' },
    },
    {
      label: '平台私钥引用',
      fieldName: 'config.privateKeyRef',
      component: 'Input',
      rules: 'required',
      help: '仅保存密钥引用，禁止填写私钥正文。',
      componentProps: { placeholder: 'env://YEEPAY_PRIVATE_KEY' },
    },
    {
      label: '易宝公钥引用',
      fieldName: 'config.publicKeyRef',
      component: 'Input',
      help: '公钥引用和证书引用二选一。',
      componentProps: { placeholder: 'env://YEEPAY_PLATFORM_PUBLIC_KEY' },
    },
    {
      label: '易宝证书引用',
      fieldName: 'config.publicCertificateRef',
      component: 'Input',
      help: '使用证书验签时填写，与公钥引用二选一。',
      componentProps: { placeholder: 'env://YEEPAY_PLATFORM_CERTIFICATE' },
    },
    {
      label: 'YOP 网关地址',
      fieldName: 'config.serverUrl',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: 'https://openapi.yeepay.com/yop-center',
      },
    },
    {
      label: 'YOS 文件/账单地址',
      fieldName: 'config.yosServerUrl',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: 'https://yos.yeepay.com/yop-center',
      },
    },
    {
      label: 'SDK 环境',
      fieldName: 'config.sdkEnv',
      component: 'RadioGroup',
      rules: 'required',
      componentProps: {
        options: [
          { value: 'prod', label: '生产' },
          { value: 'qa', label: '测试' },
        ],
        buttonStyle: 'solid',
        optionType: 'button',
      },
    },
    {
      label: '签名证书类型',
      fieldName: 'config.signingCertType',
      component: 'RadioGroup',
      rules: 'required',
      componentProps: {
        options: [
          { value: 'RSA2048', label: 'RSA2048' },
          { value: 'SM2', label: 'SM2' },
        ],
        buttonStyle: 'solid',
        optionType: 'button',
      },
    },
    {
      label: '平台证书序列号',
      fieldName: 'config.platformCertSerialNo',
      component: 'Input',
      help: 'SM2 或证书验签场景填写易宝平台证书序列号；RSA 公钥验签可留空。',
      componentProps: { placeholder: '请输入平台证书序列号' },
      dependencies: {
        triggerFields: ['config'],
        resolve({ values }) {
          return {
            show: values?.config?.signingCertType === 'SM2',
          };
        },
      },
    },
    {
      label: '平台主商编',
      fieldName: 'config.parentMerchantNo',
      component: 'Input',
      rules: 'required',
      componentProps: { placeholder: '请输入易宝平台主商编' },
    },
    {
      label: '平台收款商编',
      fieldName: 'config.collectionMerchantNo',
      component: 'Input',
      rules: 'required',
      help: '整单收款主体，不能填写商品商家的商编。',
      componentProps: { placeholder: '请输入固定平台收款商编' },
    },
    {
      label: '微信小程序 AppID',
      fieldName: 'config.appId',
      component: 'Input',
      rules: 'required',
      componentProps: { placeholder: '请输入平台统一微信小程序 AppID' },
    },
    {
      label: '资金处理方式',
      fieldName: 'config.fundProcessType',
      component: 'RadioGroup',
      rules: 'required',
      componentProps: {
        options: [{ value: 'DELAY_SETTLE', label: '延迟结算后异步分账' }],
        buttonStyle: 'solid',
        optionType: 'button',
      },
    },
    {
      label: '入网角色',
      fieldName: 'config.businessRole',
      component: 'Input',
      rules: 'required',
      componentProps: { placeholder: 'SETTLED_MERCHANT' },
    },
    {
      label: '分账权限',
      fieldName: 'config.sharePermission',
      component: 'Input',
      rules: 'required',
      componentProps: { placeholder: 'SHARE' },
    },
    {
      label: '资金归还权限',
      fieldName: 'config.divideBackPermission',
      component: 'Input',
      rules: 'required',
      componentProps: { placeholder: 'EASYSHARE_BACK_MERCHANT' },
    },
    {
      label: '全额分账保障已确认',
      fieldName: 'config.fullAmountDivideConfirmed',
      component: 'Switch',
      help: '未完成易宝手续费承担/补贴联调前必须保持关闭。',
      componentProps: {
        checkedChildren: '已确认',
        unCheckedChildren: '未确认',
      },
    },
    {
      label: '手续费承担方式',
      fieldName: 'config.feeBearerMode',
      component: 'RadioGroup',
      rules: 'required',
      componentProps: {
        options: [
          { value: 'PLATFORM_FEE_ACCOUNT', label: '平台费用账户承担' },
          { value: 'FULL_SUBSIDY_PROMOTION', label: '易宝全额补贴' },
        ],
        buttonStyle: 'solid',
        optionType: 'button',
      },
    },
    {
      label: '全额补贴活动号',
      fieldName: 'config.feeSubsidyPromotionNo',
      component: 'Input',
      help: '仅在选择全额补贴时填写易宝确认的活动号。',
      componentProps: { placeholder: '请输入 feeSubsidyPromotionNo' },
      dependencies: {
        triggerFields: ['config'],
        resolve({ values }) {
          return {
            show: values?.config?.feeBearerMode === 'FULL_SUBSIDY_PROMOTION',
          };
        },
      },
    },
    {
      label: '最大分账接收方数',
      fieldName: 'config.maxDivideRecipients',
      component: 'InputNumber',
      rules: 'required',
      componentProps: { class: '!w-full', min: 1, max: 5 },
    },
    {
      label: '请求超时（秒）',
      fieldName: 'config.timeoutSeconds',
      component: 'InputNumber',
      rules: 'required',
      componentProps: { class: '!w-full', min: 1, max: 60 },
    },
    {
      label: '连接超时（秒）',
      fieldName: 'config.connectTimeoutSeconds',
      component: 'InputNumber',
      rules: 'required',
      componentProps: { class: '!w-full', min: 1, max: 60 },
    },
    {
      label: '自动重试次数',
      fieldName: 'config.maxRetries',
      component: 'InputNumber',
      rules: 'required',
      componentProps: { class: '!w-full', min: 0, max: 10 },
    },
    {
      label: '重试退避（秒）',
      fieldName: 'config.retryBackoffSeconds',
      component: 'InputNumber',
      rules: 'required',
      componentProps: { class: '!w-full', min: 1, max: 300 },
    },
    {
      label: '每秒限流请求数',
      fieldName: 'config.rateLimitPerSecond',
      component: 'InputNumber',
      rules: 'required',
      help: '按易宝配额设置，避免回调查询和重试任务触发接口限流。',
      componentProps: { class: '!w-full', min: 1, max: 1000 },
    },
    ...createYeepayCallbackSchemas(),
  ];
}

export function createYeepayChannelDefaults(): Record<string, unknown> {
  return {
    appKeyRef: undefined,
    privateKeyRef: undefined,
    publicKeyRef: undefined,
    publicCertificateRef: undefined,
    serverUrl: 'https://openapi.yeepay.com/yop-center',
    yosServerUrl: 'https://yos.yeepay.com/yop-center',
    sdkProvider: 'yeepay',
    sdkEnv: 'prod',
    signingCertType: 'RSA2048',
    platformCertSerialNo: undefined,
    parentMerchantNo: undefined,
    collectionMerchantNo: undefined,
    appId: undefined,
    fundProcessType: 'DELAY_SETTLE',
    businessRole: 'SETTLED_MERCHANT',
    sharePermission: 'SHARE',
    divideBackPermission: 'EASYSHARE_BACK_MERCHANT',
    fullAmountDivideConfirmed: false,
    feeBearerMode: 'PLATFORM_FEE_ACCOUNT',
    feeSubsidyPromotionNo: undefined,
    maxDivideRecipients: 5,
    timeoutSeconds: 10,
    connectTimeoutSeconds: 5,
    maxRetries: 3,
    retryBackoffSeconds: 3,
    rateLimitPerSecond: 20,
  };
}

function createYeepayCallbackSchemas(): VbenFormSchema[] {
  return [
    ['paymentNotifyUrl', '支付回调地址'],
    ['clearingNotifyUrl', '清算回调地址'],
    ['divideNotifyUrl', '分账回调地址'],
    ['refundNotifyUrl', '退款回调地址'],
    ['divideBackNotifyUrl', '资金归还回调地址'],
    ['merchantNotifyUrl', '商家入网回调地址'],
  ].map(([field, label]) => ({
    label,
    fieldName: `config.${field}`,
    component: 'Input',
    rules: 'required',
    componentProps: {
      placeholder: `https://example.com/admin-api/pay/notify/yeepay/${field}`,
    },
  }));
}
