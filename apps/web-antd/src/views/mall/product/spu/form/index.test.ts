import { describe, expect, it } from 'vitest';

import source from './index.vue?raw';

describe('商品 SPU 表单提交状态', () => {
  it('提交时只显示保存按钮 loading，不遮挡商品表单内容', () => {
    expect(source).toMatch(/const submitLoading = ref\(false\)/);
    expect(source).toMatch(/<Card[\s\S]*:loading="formLoading"/);

    const tabBarExtraContent = source.match(
      /<template #tabBarExtraContent>([\s\S]*?)<\/template>/,
    )?.[1];
    expect(tabBarExtraContent).toContain(':loading="submitLoading"');
    expect(tabBarExtraContent).not.toContain(':loading="formLoading"');

    const handleSubmit = source.slice(
      source.indexOf('async function handleSubmit()'),
      source.indexOf('/** 获得详情 */'),
    );
    expect(handleSubmit).toContain('submitLoading.value = true');
    expect(handleSubmit).toContain('submitLoading.value = false');
  });

  it('提交进行中会直接忽略后续点击，避免重复保存请求', () => {
    const handleSubmit = source.slice(
      source.indexOf('async function handleSubmit()'),
      source.indexOf('/** 获得详情 */'),
    );
    expect(handleSubmit).toMatch(
      /async function handleSubmit\(\) \{\s+if \(submitLoading\.value\) \{\s+return;\s+\}/,
    );
    expect(handleSubmit.indexOf('submitLoading.value = true')).toBeLessThan(
      handleSubmit.indexOf('submitAllForm'),
    );
  });
});
