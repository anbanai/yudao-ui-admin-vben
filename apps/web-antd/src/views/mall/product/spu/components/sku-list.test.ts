import { describe, expect, it } from 'vitest';

import source from './sku-list.vue?raw';

describe('sku 表格状态边界', () => {
  it('不在组件内部生成或增量追加 SKU', () => {
    expect(source).not.toContain('function generateTableData');
    expect(source).not.toContain('function validateData');
    expect(source).not.toContain('function build(');
    expect(source).not.toContain('watch(\n  () => props.propertyList');
  });

  it('多规格表不提供删除生成行操作', () => {
    expect(source).not.toMatch(/v-else\s+type="link"[\s\S]*删除/);
    expect(source).toMatch(/v-if="isBatch && formData\?\.specType"/);
  });

  it('多规格未配置属性时阻止保存校验通过', () => {
    expect(source).toMatch(
      /formData\.value\.specType\s+&&\s+props\.propertyList\.length === 0/,
    );
  });

  it('没有 SKU 行时阻止保存空商品', () => {
    expect(source).toMatch(/const skus = formData\.value\.skus \?\? \[\]/);
    expect(source).toMatch(/skus\.length === 0/);
  });

  it('批量设置草稿绑定规格矩阵变化并在变化后重置', () => {
    expect(source).toMatch(/batchResetKey\?: number/);
    expect(source).toMatch(/watch\(\s*\(\) => props\.batchResetKey/);
    expect(source).toMatch(/skuList\.value = \[createEmptySku\(\)\]/);
  });

  it('规格列和值按 propertyId 对齐，不依赖数组下标', () => {
    expect(source).toContain('getPropertyValueName');
    expect(source).toMatch(/:key="item\.id"/);
    expect(source).not.toMatch(/row\.properties\?\.\[index\]/);
  });
});
