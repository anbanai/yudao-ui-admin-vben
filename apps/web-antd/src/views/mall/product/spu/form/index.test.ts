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
      /async function handleSubmit\(\) \{\s+if \(\s+formLoading\.value\s+\|\|\s+detailLoadFailed\.value\s+\|\|\s+descriptionUploading\.value\s+\|\|\s+!hasUnsavedChanges\.value\s+\|\|\s+submitLoading\.value\s+\) \{\s+return;/,
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
      /formLoading\.value\s+\|\|\s+detailLoadFailed\.value\s+\|\|\s+descriptionUploading\.value\s+\|\|\s+!hasUnsavedChanges\.value\s+\|\|\s+submitLoading\.value/,
    );
    expect(source).toMatch(/hasUnsavedChanges\.value = false/);
    expect(source).toMatch(/hasUnsavedChanges\.value = true/);
    expect(source).toMatch(
      /formLoading\s+\|\|\s+detailLoadFailed\s+\|\|\s+descriptionUploading\s+\|\|\s+!hasUnsavedChanges\s+\|\|\s+submitLoading/,
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

  it('属性变化由父组件对账 SKU 并一次性更新两份状态', () => {
    expect(source).toContain('reconcileSkus');
    expect(source).toContain('isSkuPropertiesSubset');
    expect(source).toMatch(
      /function handlePropertyChange\(nextList: PropertyAndValues\[\]\)/,
    );
    expect(source).toContain('let nextSkus = reconcileSkus');
    expect(source).toContain('propertyList.value = nextList');
    expect(source).toContain('formData.value.skus = nextSkus');
    expect(source).toContain('@change="handlePropertyChange"');
    expect(source).toContain('@success="handlePropertyChange"');
    expect(source).not.toContain('generateTableData');
  });

  it('切换规格类型前会确认并在取消时恢复原字段值', () => {
    expect(source).toContain('Modal.confirm');
    expect(source).toContain("skuFormApi.setFieldValue('specType'");
    expect(source).toContain('pendingSpecType');
    expect(source).toMatch(
      /async function handleChangeSpec\(\s+nextSpecType: boolean/,
    );
  });

  it('属性变更取消时重新同步子组件草稿', () => {
    expect(source).toContain('propertyList.value = [...propertyList.value]');
  });

  it('属性确认流程使用版本令牌避免旧回调覆盖新状态', () => {
    expect(source).toContain('propertyChangeVersion');
    expect(source).toMatch(
      /const requestVersion = \+\+propertyChangeVersion\.value/,
    );
    expect(source).toContain('requestVersion !== propertyChangeVersion.value');
    expect(source).toContain(
      'nextSkus = reconcileSkus(nextList, formData.value.skus ?? [])',
    );
  });

  it('子组件异步请求只绑定规格生命周期版本，不被普通属性变更取消', () => {
    expect(source).toContain('const specVersion = ref(0)');
    expect(source).toContain(':change-version="specVersion"');
    expect(source).not.toContain(':change-version="propertyChangeVersion"');
  });

  it('单规格状态下忽略过期的多规格属性事件', () => {
    expect(source).toMatch(/if \(!formData\.value\.specType\)\s*\{\s*return;/);
    expect(source).toContain(':change-version="specVersion"');
  });

  it('详情模式隐藏新增属性入口', () => {
    expect(source).toMatch(
      /<Button[^>]*v-if="!isDetail"[^>]*@click="openPropertyAddForm"/,
    );
  });
});
