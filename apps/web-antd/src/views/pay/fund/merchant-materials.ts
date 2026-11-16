const materialRoots = new Set([
  'accountInfo',
  'businessAddressInfo',
  'functionService',
  'functionServiceQualificationInfo',
  'industryCategoryInfo',
  'merchantContactInfo',
  'merchantCorporationInfo',
  'merchantSubjectInfo',
  'merchantType',
  'productInfo',
]);
const fileRoots = new Set([
  'accountInfo',
  'businessAddressInfo',
  'functionServiceQualificationInfo',
  'merchantContactInfo',
  'merchantCorporationInfo',
  'merchantSubjectInfo',
  'productInfo',
]);
const credentials = new Set([
  'aeskey',
  'apikey',
  'appsecret',
  'certificatepassword',
  'encryptkey',
  'hmackey',
  'merchantprivatekey',
  'privatekey',
  'secretkey',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function containsCredentials(value: unknown): boolean {
  if (Array.isArray(value))
    return value.some((item) => containsCredentials(item));
  return (
    isObject(value) &&
    Object.entries(value).some(
      ([key, item]) =>
        credentials.has(key.replaceAll('_', '').toLowerCase()) ||
        containsCredentials(item),
    )
  );
}

export function parseMaterialInput(materials: string, fileReferences: string) {
  try {
    const body: unknown = JSON.parse(materials);
    const references: unknown = JSON.parse(fileReferences || '{}');
    if (!isObject(body) || !isObject(references))
      throw new Error('Invalid merchant material structure');
    if (
      Object.keys(body).some((key) => !materialRoots.has(key)) ||
      containsCredentials(body)
    ) {
      throw new Error('Invalid merchant material structure');
    }
    const subject = body.merchantSubjectInfo;
    const merchantType =
      body.merchantType ?? (isObject(subject) ? subject.merchantType : '');
    const micro =
      typeof merchantType === 'string' &&
      [
        'MICRO',
        'MICRO_MERCHANT',
        'SMALL_MICRO',
        'SMALL_MICRO_MERCHANT',
      ].includes(merchantType.trim().toUpperCase());
    const groups = [
      'merchantSubjectInfo',
      'merchantCorporationInfo',
      'businessAddressInfo',
      ...(micro ? [] : ['merchantContactInfo']),
    ];
    if (
      groups.some(
        (key) => !isObject(body[key]) || Object.keys(body[key]).length === 0,
      )
    ) {
      throw new Error('Invalid merchant material structure');
    }
    const qualification = body.functionServiceQualificationInfo;
    if (
      !isObject(qualification) ||
      typeof qualification.shareScene !== 'string' ||
      !qualification.shareScene.trim()
    ) {
      throw new Error('Invalid merchant material structure');
    }
    for (const [path, id] of Object.entries(references)) {
      const root = path.split('.')[0] ?? '';
      const field = path.split('.')[1] ?? '';
      if (
        !/^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/.test(path) ||
        !fileRoots.has(root) ||
        credentials.has(field.toLowerCase()) ||
        !isObject(body[root]) ||
        typeof id !== 'number' ||
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {
        throw new Error('Invalid merchant material structure');
      }
    }
    return {
      materials: body,
      fileReferences: references as Record<string, number>,
    };
  } catch {
    // Parse failures can contain rejected input; show only a fixed guidance message.
    throw new Error(
      '请检查官方资料对象、必填组、SHARE场景及私有文件编号，禁止填写渠道密钥。',
    );
  }
}

export function safeActionUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function mayEditMaterials(state: string) {
  return [
    'ACTION_REQUIRED',
    'READY',
    'RETRY',
    'SUBMITTED',
    'WAITING_MATERIALS',
  ].includes(state);
}

export function createMerchantMaterialRequests() {
  let epoch = 0;

  return {
    capture() {
      const current = epoch;
      return () => current === epoch;
    },
    invalidate() {
      epoch++;
    },
    async load<T>(
      onboardingId: number,
      request: (id: number) => Promise<T>,
    ): Promise<T | undefined> {
      const current = ++epoch;
      try {
        const result = await request(onboardingId);
        return current === epoch ? result : undefined;
      } catch (error) {
        if (current === epoch) throw error;
        return undefined;
      }
    },
    async upload(
      onboardingId: number,
      fieldPath: string,
      request: (id: number) => Promise<number>,
    ) {
      const current = epoch;
      try {
        const fileId = await request(onboardingId);
        return current === epoch ? { fieldPath, fileId } : undefined;
      } catch (error) {
        if (current === epoch) throw error;
        return undefined;
      }
    },
  };
}

export function createMerchantPageLoader<T>(callbacks: {
  onError: () => void;
  onLoading: (loading: boolean) => void;
  onResult: (result: T) => void;
}) {
  let epoch = 0;

  return {
    invalidate() {
      epoch++;
    },
    async load(request: () => Promise<T>) {
      const current = ++epoch;
      callbacks.onLoading(true);
      try {
        const result = await request();
        if (current === epoch) callbacks.onResult(result);
      } catch {
        if (current === epoch) callbacks.onError();
      } finally {
        if (current === epoch) callbacks.onLoading(false);
      }
    },
  };
}
