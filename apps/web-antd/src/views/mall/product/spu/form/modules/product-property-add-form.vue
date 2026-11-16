<!-- 商品发布 - 库存价格 - 添加属性 -->
<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { MallPropertyApi } from '#/api/mall/product/property';
import type { PropertyAndValues } from '#/views/mall/product/spu/components';

import { ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createProperty,
  getPropertySimpleList,
} from '#/api/mall/product/property';
import { $t } from '#/locales';

defineOptions({ name: 'ProductPropertyAddForm' });

const props = defineProps({
  propertyList: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits<{
  success: [value: PropertyAndValues[]];
}>();

const attributeList = ref<PropertyAndValues[]>([]); // 商品属性列表
const attributeOptions = ref<MallPropertyApi.Property[]>([]); // 商品属性名称下拉框

function clonePropertyList(list: PropertyAndValues[]): PropertyAndValues[] {
  return list.map((property) => ({
    ...property,
    values: (property.values ?? []).map((value) => ({ ...value })),
  }));
}

watch(
  () => props.propertyList,
  (data) => {
    if (!data) {
      return;
    }
    attributeList.value = clonePropertyList(data as PropertyAndValues[]);
  },
  {
    deep: true,
    immediate: true,
  },
);

const formSchema: VbenFormSchema[] = [
  {
    fieldName: 'name',
    label: '属性名称',
    component: 'ApiSelect',
    componentProps: {
      api: async () => {
        const data = await getPropertySimpleList();
        attributeOptions.value = data;
        return data.map((item: MallPropertyApi.Property) => ({
          label: item.name,
          value: item.name,
        }));
      },
      showSearch: true,
      filterOption: true,
      placeholder: '请选择属性名称。如果不存在，可手动输入选择',
      mode: 'tags',
      allowClear: true,
    },
    rules: 'required',
  },
];

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 80,
  },
  layout: 'horizontal',
  schema: formSchema,
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      const names = [
        ...new Set(
          (Array.isArray(values.name) ? values.name : [values.name])
            .map((name: string) => name?.trim())
            .filter(Boolean),
        ),
      ];
      const nextList = clonePropertyList(attributeList.value);

      for (const name of names) {
        if (nextList.some((item) => item.name === name)) {
          message.error('该属性已存在，请勿重复添加');
          return;
        }

        const existProperty = attributeOptions.value.find(
          (item: MallPropertyApi.Property) => item.name === name,
        );
        const propertyId =
          existProperty?.id ?? (await createProperty({ name }));
        nextList.push({
          id: propertyId,
          name,
          values: [],
        });
      }
      attributeList.value = nextList;
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('success', nextList);
      await modalApi.close();
    } catch {
      message.error($t('ui.actionMessage.operationFailed'));
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal title="添加商品属性">
    <Form />
  </Modal>
</template>
