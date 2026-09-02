import { describe, expect, it, vi } from 'vitest';

import { migrateLegacyProductGroupComponent } from './component-migration';

describe('diy component migration', () => {
  it('registers category and group as separate product components', async () => {
    vi.stubEnv(
      'VITE_OSS_BASE_URL',
      'https://teaworthshare.oss-cn-chengdu.aliyuncs.com',
    );
    const [{ PAGE_LIBS }, { componentConfigs }] = await Promise.all([
      import('../../util'),
      import('./index'),
    ]);
    const productLibrary = PAGE_LIBS.find(
      (library) => library.name === '商品组件',
    );
    expect(productLibrary?.components).toEqual(
      expect.arrayContaining(['ProductCategory', 'ProductGroup']),
    );
    expect(componentConfigs.ProductCategory?.name).toBe('商品分类');
    expect(componentConfigs.ProductGroup?.name).toBe('商品分组');
    vi.unstubAllEnvs();
  });

  it('migrates the former category-backed ProductGroup to ProductCategory', () => {
    const item = {
      id: 'ProductGroup',
      property: { categoryIds: [12, 13], pageSize: 10 },
    };

    expect(migrateLegacyProductGroupComponent(item)).toEqual({
      id: 'ProductCategory',
      property: { categoryIds: [12, 13], pageSize: 10 },
    });
  });

  it('does not migrate current group-backed ProductGroup data', () => {
    const item = { id: 'ProductGroup', property: { groupIds: [8] } };
    expect(migrateLegacyProductGroupComponent(item)).toBe(item);
  });

  it('migrates legacy category data after it gained an empty groupIds field', () => {
    expect(
      migrateLegacyProductGroupComponent({
        id: 'ProductGroup',
        property: { categoryIds: [12], groupIds: [] },
      }),
    ).toEqual({
      id: 'ProductCategory',
      property: { categoryIds: [12] },
    });
  });
});
