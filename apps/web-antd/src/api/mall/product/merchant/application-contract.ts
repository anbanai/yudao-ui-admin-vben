import type { MallMerchantApi } from './index';

export interface MerchantApplicationTerms {
  available: boolean;
  agreementVersion?: string;
  agreementUrl?: string;
  privacyPolicyVersion?: string;
  privacyPolicyUrl?: string;
}

export interface MerchantApplicationSubmitReqVO {
  accepted: boolean;
  agreementVersion: string;
  privacyPolicyVersion: string;
}

export function mergeBusinessTypeRequirements(
  businessTypes: readonly MallMerchantApi.BusinessType[],
) {
  const requirements = new Map<
    string,
    MallMerchantApi.QualificationRequirement
  >();
  for (const businessType of businessTypes) {
    for (const requirement of businessType.requirements ?? []) {
      const current = requirements.get(requirement.code);
      requirements.set(
        requirement.code,
        current
          ? {
              ...current,
              required: current.required || requirement.required,
              certificateNoRequired:
                current.certificateNoRequired ||
                requirement.certificateNoRequired,
              validityRequired:
                current.validityRequired || requirement.validityRequired,
            }
          : requirement,
      );
    }
  }
  return [...requirements.values()];
}

export function buildMerchantApplicationDraft(
  application: MallMerchantApi.Application,
  activeRequirementCodes: ReadonlySet<string>,
): MallMerchantApi.ApplicationDraftReqVO {
  return {
    businessTypes: [...(application.businessTypes ?? [])],
    companyName: application.companyName,
    contactMobile: application.contactMobile,
    contactName: application.contactName,
    creditCode: application.creditCode,
    legalPerson: application.legalPerson,
    logoUrl: application.logoUrl,
    name: application.name,
    qualifications: (application.qualifications ?? [])
      .filter((item) => activeRequirementCodes.has(item.code))
      .map(({ code, certificateNo, fileId, validStart, validEnd }) => ({
        code,
        certificateNo,
        fileId,
        validStart,
        validEnd,
      })),
    storeName: application.storeName,
  };
}

export function buildMerchantApplicationSubmission(
  accepted: boolean,
  terms: MerchantApplicationTerms,
): MerchantApplicationSubmitReqVO {
  if (
    !terms.available ||
    !terms.agreementVersion ||
    !terms.privacyPolicyVersion
  ) {
    throw new Error('商家协议尚未配置');
  }
  return {
    accepted,
    agreementVersion: terms.agreementVersion,
    privacyPolicyVersion: terms.privacyPolicyVersion,
  };
}

export function compareMerchantApplications(
  previous: MallMerchantApi.Application,
  current: MallMerchantApi.Application,
) {
  const fields = [
    ['name', '商家名称'],
    ['storeName', '店铺名称'],
    ['companyName', '企业主体'],
    ['creditCode', '统一社会信用代码'],
    ['legalPerson', '法人'],
    ['contactName', '联系人'],
    ['contactMobile', '联系电话'],
  ] as const;
  const changes: Array<{ current: string; field: string; previous: string }> =
    [];
  const add = (field: string, before: unknown, after: unknown) => {
    const oldValue = String(before ?? '');
    const newValue = String(after ?? '');
    if (oldValue !== newValue)
      changes.push({
        field,
        previous: oldValue || '-',
        current: newValue || '-',
      });
  };
  fields.forEach(([key, label]) => add(label, previous[key], current[key]));
  add(
    '经营类型',
    [...previous.businessTypes].sort().join('、'),
    [...current.businessTypes].sort().join('、'),
  );
  const codes = new Set(
    [...previous.qualifications, ...current.qualifications].map(
      (item) => item.code,
    ),
  );
  for (const code of codes) {
    const oldQualification = previous.qualifications.find(
      (item) => item.code === code,
    );
    const newQualification = current.qualifications.find(
      (item) => item.code === code,
    );
    for (const [key, label] of [
      ['fileId', '文件编号'],
      ['certificateNo', '证件编号'],
      ['validStart', '有效期起'],
      ['validEnd', '有效期止'],
    ] as const) {
      add(
        `${newQualification?.name || oldQualification?.name || code} · ${label}`,
        oldQualification?.[key],
        newQualification?.[key],
      );
    }
  }
  return changes;
}
