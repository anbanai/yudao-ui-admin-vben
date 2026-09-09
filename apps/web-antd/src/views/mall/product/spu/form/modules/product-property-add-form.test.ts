import { describe, expect, it } from 'vitest';

import source from './product-property-add-form.vue?raw';

describe('商品属性添加弹窗', () => {
  it('锁定期间无论重复校验或接口失败都保证解锁', () => {
    const onConfirm = source.slice(
      source.indexOf('async onConfirm()'),
      source.indexOf('  },\n});', source.indexOf('async onConfirm()')),
    );

    expect(onConfirm).toMatch(/modalApi\.lock\(\);\s+try \{/);
    expect(onConfirm).toMatch(/finally \{\s+modalApi\.unlock\(\);/);
  });

  it('成功后通过事件提交完整的新属性列表', () => {
    expect(source).toMatch(/emit\('success',\s*nextList\)/);
    expect(source.indexOf("emit('success', nextList)")).toBeLessThan(
      source.indexOf('await modalApi.close()'),
    );
  });
});
