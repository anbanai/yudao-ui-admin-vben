import type { MerchantWorkbenchApi } from '#/api/merchant/workbench';

import { SF_PAPER_SPEC_OPTIONS } from '../trade/logistics/sf/paper-spec';

export function createSettingsForm(config: MerchantWorkbenchApi.SfConfig) {
  const paperOptions = SF_PAPER_SPEC_OPTIONS.filter((spec) =>
    config.supportedPaperSpecs.includes(spec.value),
  );
  const paper =
    paperOptions.find(
      (spec) =>
        spec.heightMm === config.paperHeightMm &&
        spec.widthMm === config.paperWidthMm,
    ) ?? paperOptions[0];
  return {
    monthlyCard: '',
    serviceCode: config.serviceCode ?? '1',
    defaultWeightKg: config.defaultWeightKg ?? 1,
    paperSpec: paper?.value,
    senderName: config.senderName ?? '',
    senderPhone: config.senderPhone ?? '',
    senderProvince: config.senderProvince ?? '',
    senderCity: config.senderCity ?? '',
    senderDistrict: config.senderDistrict ?? '',
    senderAddress: config.senderAddress ?? '',
    returnSameAsSender: config.returnSameAsSender ?? true,
    returnName: config.returnName ?? '',
    returnPhone: config.returnPhone ?? '',
    returnProvince: config.returnProvince ?? '',
    returnCity: config.returnCity ?? '',
    returnDistrict: config.returnDistrict ?? '',
    returnAddress: config.returnAddress ?? '',
  };
}

export function settingsPayload(
  form: ReturnType<typeof createSettingsForm>,
): MerchantWorkbenchApi.SfConfigUpdate {
  const {
    paperSpec,
    monthlyCard,
    returnName,
    returnPhone,
    returnProvince,
    returnCity,
    returnDistrict,
    returnAddress,
    ...settings
  } = form;
  const paper = SF_PAPER_SPEC_OPTIONS.find((spec) => spec.value === paperSpec);
  return {
    ...settings,
    monthlyCard: monthlyCard.trim() || undefined,
    paperWidthMm: paper?.widthMm,
    paperHeightMm: paper?.heightMm,
    dpi: paper?.dpi,
    ...(form.returnSameAsSender
      ? {}
      : {
          returnName,
          returnPhone,
          returnProvince,
          returnCity,
          returnDistrict,
          returnAddress,
        }),
  };
}
