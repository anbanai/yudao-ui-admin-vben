import { describe, expect, it } from 'vitest';

import {
  createMerchantMaterialRequests,
  createMerchantPageLoader,
  mayEditMaterials,
  parseMaterialInput,
  safeActionUrl,
} from './merchant-materials';

function materials() {
  return {
    merchantSubjectInfo: { merchantType: 'ENTERPRISE' },
    merchantCorporationInfo: { legalPersonName: '测试法人' },
    merchantContactInfo: { contactName: '测试联系人' },
    businessAddressInfo: { province: '北京市' },
    functionServiceQualificationInfo: { shareScene: 'MINI_PROGRAM' },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('merchant onboarding material validation', () => {
  it('accepts complete official groups and positive private file references', () => {
    const body = parseMaterialInput(
      JSON.stringify(materials()),
      '{"merchantSubjectInfo.businessLicenseUrl":71}',
    );
    expect(body.fileReferences).toEqual({
      'merchantSubjectInfo.businessLicenseUrl': 71,
    });
  });

  it('rejects incomplete or wrongly shaped material groups before submission', () => {
    expect(() => parseMaterialInput('{}', '{}')).toThrow('请检查官方资料对象');
    expect(() => parseMaterialInput('[]', '{}')).toThrow('请检查官方资料对象');
    expect(() => parseMaterialInput('{', '{}')).toThrow('请检查官方资料对象');
    const invalid = { ...materials(), merchantContactInfo: [] };
    expect(() => parseMaterialInput(JSON.stringify(invalid), '{}')).toThrow(
      '请检查官方资料对象',
    );
  });

  it('accepts micro merchants without an optional contact group', () => {
    const micro = { ...materials(), merchantType: 'SMALL_MICRO' };
    const { merchantContactInfo: _contact, ...rest } = micro;
    expect(() => parseMaterialInput(JSON.stringify(rest), '{}')).not.toThrow();
  });

  it('rejects nested channel credentials and unknown root objects', () => {
    const credential = {
      ...materials(),
      accountInfo: { extra: [{ api_key: 'private-secret' }] },
    };
    expect(() => parseMaterialInput(JSON.stringify(credential), '{}')).toThrow(
      '请检查官方资料对象',
    );
    expect(() =>
      parseMaterialInput(
        JSON.stringify({ ...materials(), requestNo: 'override' }),
        '{}',
      ),
    ).toThrow('请检查官方资料对象');
  });

  it('rejects invalid file paths, foreign material groups and fractional file ids', () => {
    const json = JSON.stringify(materials());
    expect(() => parseMaterialInput(json, '{"requestNo.field":1}')).toThrow(
      '请检查官方资料对象',
    );
    expect(() =>
      parseMaterialInput(json, '{"merchantSubjectInfo.file":0}'),
    ).toThrow('请检查官方资料对象');
    expect(() =>
      parseMaterialInput(json, '{"merchantSubjectInfo.file":1.5}'),
    ).toThrow('请检查官方资料对象');
    expect(() =>
      parseMaterialInput(json, '{"merchantSubjectInfo.file.url":2}'),
    ).toThrow('请检查官方资料对象');
    expect(() =>
      parseMaterialInput(json, '{"merchantSubjectInfo.privateKey":2}'),
    ).toThrow('请检查官方资料对象');
  });

  it('only exposes secure external action links', () => {
    expect(safeActionUrl('https://pay.test/sign')).toBe(
      'https://pay.test/sign',
    );
    for (const value of [
      'javascript:alert(1)',
      'http://pay.test',
      '/relative',
      'https://user:secret@pay.test',
    ]) {
      expect(safeActionUrl(value)).toBeUndefined();
    }
  });

  it('prevents edits to completed or superseded applications', () => {
    expect(mayEditMaterials('WAITING_MATERIALS')).toBe(true);
    expect(mayEditMaterials('ACTION_REQUIRED')).toBe(true);
    expect(mayEditMaterials('COMPLETED')).toBe(false);
    expect(mayEditMaterials('SUPERSEDED')).toBe(false);
    expect(mayEditMaterials('UNKNOWN')).toBe(false);
  });
});

describe('merchant onboarding page queries', () => {
  function pageLoader() {
    const state = { list: [] as number[], total: 0, loading: false, errors: 0 };
    const loader = createMerchantPageLoader<{ list: number[]; total: number }>({
      onResult(result) {
        state.list = result.list;
        state.total = result.total;
      },
      onLoading(loading) {
        state.loading = loading;
      },
      onError() {
        state.errors++;
      },
    });
    return { loader, state };
  }

  it('preserves the latest page rows and total when an earlier query returns last', async () => {
    const { loader, state } = pageLoader();
    const first = deferred<{ list: number[]; total: number }>();
    const second = deferred<{ list: number[]; total: number }>();
    const firstLoad = loader.load(() => first.promise);
    const secondLoad = loader.load(() => second.promise);

    second.resolve({ list: [22], total: 2 });
    await secondLoad;
    first.resolve({ list: [11], total: 100 });
    await firstLoad;

    expect(state).toEqual({ list: [22], total: 2, loading: false, errors: 0 });
  });

  it('keeps the latest query loading when an earlier query finishes first', async () => {
    const { loader, state } = pageLoader();
    const first = deferred<{ list: number[]; total: number }>();
    const second = deferred<{ list: number[]; total: number }>();
    const firstLoad = loader.load(() => first.promise);
    const secondLoad = loader.load(() => second.promise);

    first.resolve({ list: [11], total: 100 });
    await firstLoad;
    expect(state).toEqual({ list: [], total: 0, loading: true, errors: 0 });

    second.resolve({ list: [22], total: 2 });
    await secondLoad;
    expect(state.loading).toBe(false);
  });

  it('ignores an earlier query failure while the latest query is pending', async () => {
    const { loader, state } = pageLoader();
    const first = deferred<{ list: number[]; total: number }>();
    const second = deferred<{ list: number[]; total: number }>();
    const firstLoad = loader.load(() => first.promise);
    const secondLoad = loader.load(() => second.promise);

    first.reject(new Error('stale query'));
    await firstLoad;
    expect(state.errors).toBe(0);
    expect(state.loading).toBe(true);

    second.resolve({ list: [22], total: 2 });
    await secondLoad;
  });

  it('reports the latest query failure and finishes its loading state', async () => {
    const { loader, state } = pageLoader();
    const response = deferred<{ list: number[]; total: number }>();
    const loading = loader.load(() => response.promise);

    response.reject(new Error('current query'));
    await loading;

    expect(state).toEqual({ list: [], total: 0, loading: false, errors: 1 });
  });

  it('does not update page state after the page is unmounted', async () => {
    const { loader, state } = pageLoader();
    const response = deferred<{ list: number[]; total: number }>();
    const loading = loader.load(() => response.promise);

    loader.invalidate();
    response.resolve({ list: [11], total: 100 });
    await loading;

    expect(state).toEqual({ list: [], total: 0, loading: true, errors: 0 });
  });
});

describe('merchant onboarding request context', () => {
  it('accepts only the latest selected merchant detail', async () => {
    const requests = createMerchantMaterialRequests();
    const first = deferred<{ onboardingId: number }>();
    const second = deferred<{ onboardingId: number }>();
    const firstLoad = requests.load(11, () => first.promise);
    const secondLoad = requests.load(22, () => second.promise);

    second.resolve({ onboardingId: 22 });
    expect(await secondLoad).toEqual({ onboardingId: 22 });
    first.resolve({ onboardingId: 11 });
    expect(await firstLoad).toBeUndefined();
  });

  it('does not restore a closed drawer from a late detail response', async () => {
    const requests = createMerchantMaterialRequests();
    const response = deferred<{ onboardingId: number }>();
    const loading = requests.load(11, () => response.promise);

    requests.invalidate();
    response.resolve({ onboardingId: 11 });

    expect(await loading).toBeUndefined();
  });

  it('does not repopulate cleared material references after closing the drawer', async () => {
    const requests = createMerchantMaterialRequests();
    await requests.load(11, async () => ({ onboardingId: 11 }));
    const response = deferred<number>();
    const uploading = requests.upload(
      11,
      'merchantSubjectInfo.businessLicenseUrl',
      () => response.promise,
    );
    let fileReferences = '{}';

    requests.invalidate();
    response.resolve(71);
    const uploaded = await uploading;
    if (uploaded) {
      fileReferences = JSON.stringify({
        [uploaded.fieldPath]: uploaded.fileId,
      });
    }

    expect(fileReferences).toBe('{}');
  });

  it('does not attach an earlier merchant upload to a newly selected merchant', async () => {
    const requests = createMerchantMaterialRequests();
    await requests.load(11, async () => ({ onboardingId: 11 }));
    const response = deferred<number>();
    const uploading = requests.upload(
      11,
      'merchantSubjectInfo.businessLicenseUrl',
      () => response.promise,
    );

    await requests.load(22, async () => ({ onboardingId: 22 }));
    response.resolve(71);

    expect(await uploading).toBeUndefined();
  });

  it('retains the task and field chosen when an upload starts', async () => {
    const requests = createMerchantMaterialRequests();
    let onboardingId = 11;
    let fieldPath = 'merchantSubjectInfo.businessLicenseUrl';
    let requestedId: number | undefined;
    const response = deferred<number>();
    const uploading = requests.upload(onboardingId, fieldPath, (id) => {
      requestedId = id;
      return response.promise;
    });

    onboardingId = 22;
    fieldPath = 'merchantCorporationInfo.idCardFrontUrl';
    response.resolve(71);

    expect(requestedId).toBe(11);
    expect(await uploading).toEqual({
      fieldPath: 'merchantSubjectInfo.businessLicenseUrl',
      fileId: 71,
    });
    expect(onboardingId).toBe(22);
    expect(fieldPath).toBe('merchantCorporationInfo.idCardFrontUrl');
  });

  it('does not clear a new merchant form after an earlier save finishes', async () => {
    const requests = createMerchantMaterialRequests();
    await requests.load(11, async () => ({ onboardingId: 11 }));
    const isCurrent = requests.capture();
    const saving = deferred<undefined>();
    let materialInput = 'new merchant input';

    await requests.load(22, async () => ({ onboardingId: 22 }));
    saving.resolve(undefined);
    await saving.promise;
    if (isCurrent()) materialInput = '';

    expect(materialInput).toBe('new merchant input');
  });

  it('ignores failures from an old drawer and surfaces current failures', async () => {
    const requests = createMerchantMaterialRequests();
    const staleResponse = deferred<number>();
    const staleUpload = requests.upload(
      11,
      'merchantSubjectInfo.businessLicenseUrl',
      () => staleResponse.promise,
    );
    requests.invalidate();
    staleResponse.reject(new Error('old merchant failure'));
    expect(await staleUpload).toBeUndefined();

    const error = new Error('current merchant failure');
    await expect(
      requests.load(22, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
});
