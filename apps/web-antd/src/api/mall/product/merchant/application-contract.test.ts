import type { MallMerchantApi } from './index';

import { describe, expect, it } from 'vitest';

import {
  buildMerchantApplicationDraft,
  buildMerchantApplicationSubmission,
  compareMerchantApplications,
  mergeBusinessTypeRequirements,
} from './application-contract';

describe('merchant application contract', () => {
  it('merges backend requirements by code and combines required fields', () => {
    const requirements = mergeBusinessTypeRequirements([
      {
        code: 'FOOD',
        id: 1,
        name: '食品经营',
        requirements: [
          {
            code: 'LICENSE',
            name: '经营许可证',
            required: true,
            certificateNoRequired: false,
            validityRequired: false,
          },
        ],
      },
      {
        code: 'DRINK',
        id: 2,
        name: '饮品经营',
        requirements: [
          {
            code: 'LICENSE',
            name: '经营许可证',
            required: false,
            certificateNoRequired: true,
            validityRequired: true,
          },
        ],
      },
    ] satisfies MallMerchantApi.BusinessType[]);

    expect(requirements).toEqual([
      {
        code: 'LICENSE',
        name: '经营许可证',
        required: true,
        certificateNoRequired: true,
        validityRequired: true,
      },
    ]);
  });

  it('sends business type codes and qualification codes in the draft', () => {
    const application = {
      businessTypes: ['FOOD'],
      businessTypeIds: [1],
      contactMobile: '13800000000',
      name: '示例商家',
      qualifications: [
        {
          code: 'LICENSE',
          certificateNo: 'LIC-001',
          fileId: 22,
          fileName: 'license.pdf',
          previewUrl: '/license.pdf',
          type: 'legacy-field',
        },
        { code: 'UNSELECTED', fileId: 23 },
      ],
      storeName: '示例店铺',
    } as MallMerchantApi.Application;

    expect(
      buildMerchantApplicationDraft(application, new Set(['LICENSE'])),
    ).toEqual({
      businessTypes: ['FOOD'],
      contactMobile: '13800000000',
      name: '示例商家',
      qualifications: [
        {
          certificateNo: 'LIC-001',
          code: 'LICENSE',
          fileId: 22,
        },
      ],
      storeName: '示例店铺',
    });
  });

  it('includes acceptance and both policy versions in the submit request', () => {
    expect(
      buildMerchantApplicationSubmission(true, {
        available: true,
        agreementVersion: 'merchant-1.0',
        privacyPolicyVersion: 'privacy-1.0',
      }),
    ).toEqual({
      accepted: true,
      agreementVersion: 'merchant-1.0',
      privacyPolicyVersion: 'privacy-1.0',
    });
  });

  it('rejects submissions when the platform has not configured terms', () => {
    expect(() =>
      buildMerchantApplicationSubmission(true, { available: false }),
    ).toThrow('商家协议尚未配置');
  });
});

describe('application revision comparison', () => {
  it('compares entity and evidence fields without comparing expiring preview URLs', () => {
    const previous: MallMerchantApi.Application = {
      name: '商家',
      storeName: '店铺',
      companyName: '原企业',
      businessTypes: ['RETAIL', 'FOOD'],
      qualifications: [
        {
          code: 'LICENSE',
          name: '执照',
          fileId: 1,
          certificateNo: '旧编号',
          previewUrl: 'old-signed-url',
        },
      ],
    };
    const current = {
      ...previous,
      companyName: '新企业',
      businessTypes: ['FOOD', 'RETAIL'],
      qualifications: [
        {
          ...previous.qualifications[0]!,
          fileId: 2,
          certificateNo: '新编号',
          previewUrl: 'new-signed-url',
        },
      ],
    };
    expect(compareMerchantApplications(previous, current)).toEqual([
      { field: '企业主体', previous: '原企业', current: '新企业' },
      { field: '执照 · 文件编号', previous: '1', current: '2' },
      { field: '执照 · 证件编号', previous: '旧编号', current: '新编号' },
    ]);
  });
});
