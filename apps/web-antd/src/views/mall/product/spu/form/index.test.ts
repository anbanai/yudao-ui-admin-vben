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
      /async function handleSubmit\(\) \{\s+if \(\s+formLoading\.value\s+\|\|\s+detailLoadFailed\.value\s+\|\|\s+!hasUnsavedChanges\.value\s+\|\|\s+submitLoading\.value\s+\) \{\s+return;/,
    );
    expect(handleSubmit.indexOf('submitLoading.value = true')).toBeLessThan(
      handleSubmit.indexOf('submitAllForm'),
    );
  });

  it('保存成功后禁用无变更保存，修改内容后重新允许保存', () => {
    expect(source).toMatch(/const formLoading = ref\(Boolean\(params\.id\)\)/);
    expect(source).toMatch(/const hasUnsavedChanges = ref\(!params\.id\)/);
    expect(source).toMatch(/const detailLoadFailed = ref\(false\)/);
    expect(source).toMatch(
      /formLoading\.value\s+\|\|\s+detailLoadFailed\.value\s+\|\|\s+!hasUnsavedChanges\.value\s+\|\|\s+submitLoading\.value/,
    );
    expect(source).toMatch(/hasUnsavedChanges\.value = false/);
    expect(source).toMatch(/hasUnsavedChanges\.value = true/);
    expect(source).toMatch(
      /formLoading\s+\|\|\s+detailLoadFailed\s+\|\|\s+!hasUnsavedChanges\s+\|\|\s+submitLoading/,
    );
    expect(source).toMatch(
      /if \(changeVersion\.value === submittedChangeVersion\) \{\s+hasUnsavedChanges\.value = false;/,
    );
    expect(source).toMatch(
      /const savedPayloadSnapshot = ref<null \| string>\(null\)/,
    );
    expect(source).toMatch(
      /if \(savedPayloadSnapshot\.value === JSON\.stringify\(preparedValues\)\) \{\s+hasUnsavedChanges\.value = false;\s+return;/,
    );
    expect(source).toMatch(
      /if \(!spuId\.value\) \{\s+spuId\.value = savedSpuId;\s+\}/,
    );
    expect(source).toMatch(
      /savedPayloadSnapshot\.value = JSON\.stringify\(\s+prepareSubmissionValues\(initialValues\),\s+\)/,
    );
    expect(source).not.toContain('@change.capture="markUnsavedChanges"');
    expect(source).not.toContain('@input.capture="markUnsavedChanges"');
    expect(source).toMatch(/v-if="detailLoadFailed"/);
    expect(source).toMatch(/@click="getDetail"/);
  });
});
