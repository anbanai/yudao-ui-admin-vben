<script lang="ts" setup>
import type { MallSpuApi } from '#/api/mall/product/spu';
import type {
  PropertyAndValues,
  RuleConfig,
} from '#/views/mall/product/spu/components';

import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { convertToInteger, formatToFraction } from '@vben/utils';

import { Alert, Button, Card, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createSpu, getSpu, updateSpu } from '#/api/mall/product/spu';
import { withOperationFeedback } from '#/utils/operation-feedback';
import { getPropertyList, SkuList } from '#/views/mall/product/spu/components';

import {
  useDeliveryFormSchema,
  useDescriptionFormSchema,
  useInfoFormSchema,
  useOtherFormSchema,
  useSkuFormSchema,
} from './data';
import ProductAttributes from './modules/product-attributes.vue';
import ProductPropertyAddForm from './modules/product-property-add-form.vue';

const spuId = ref<number>();
const { params, name } = useRoute();
const { closeCurrentTab } = useTabs();
const activeTabName = ref('info');
const formLoading = ref(Boolean(params.id)); // 表单详情的加载中
const submitLoading = ref(false); // 表单提交的加载中
const hasUnsavedChanges = ref(!params.id); // 是否存在待保存的修改
const detailLoadFailed = ref(false); // 商品详情加载是否失败
const changeVersion = ref(0); // 表单变更版本，用于识别保存期间的修改
const savedPayloadSnapshot = ref<null | string>(null);
const isDetail = ref(name === 'ProductSpuDetail'); // 是否查看详情
const initializingForm = ref(false); // 详情回填时不触发 SKU 重置逻辑
const skuListRef = ref(); // 商品属性列表 Ref

const formData = ref<MallSpuApi.Spu>({
  name: '',
  categoryId: undefined,
  keyword: '',
  picUrl: '',
  sliderPicUrls: [],
  introduction: '',
  deliveryTypes: [],
  deliveryTemplateId: undefined,
  brandId: undefined,
  specType: false,
  subCommissionType: false,
  skus: [
    {
      name: '', // SKU 名称，提交时会自动使用 SPU 名称
      price: 0,
      marketPrice: 0,
      costPrice: 0,
      barCode: '',
      picUrl: '',
      stock: 0,
      weight: 0,
      volume: 0,
      firstBrokeragePrice: 0,
      secondBrokeragePrice: 0,
    },
  ],
  description: '',
  sort: 0,
  giveIntegral: 0,
  virtualSalesCount: 0,
}); // spu 表单数据
const propertyList = ref<PropertyAndValues[]>([]); // 商品属性列表
const ruleConfig: RuleConfig[] = [
  {
    name: 'stock',
    rule: (arg: number) => arg >= 0,
    message: '商品库存必须大于等于 1 ！！！',
  },
  {
    name: 'price',
    rule: (arg: number) => arg >= 0.01,
    message: '商品销售价格必须大于等于 0.01 元！！！',
  },
  {
    name: 'marketPrice',
    rule: (arg: number) => arg >= 0.01,
    message: '商品市场价格必须大于等于 0.01 元！！！',
  },
  {
    name: 'costPrice',
    rule: (arg: number) => arg >= 0.01,
    message: '商品成本价格必须大于等于 0.00 元！！！',
  },
]; // sku 相关属性校验规则

const [InfoForm, infoFormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useInfoFormSchema(),
  showDefaultActions: false,
  handleValuesChange: markUnsavedChanges,
});

const [SkuForm, skuFormApi] = useVbenForm({
  commonConfig: {
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useSkuFormSchema(propertyList.value, isDetail.value),
  showDefaultActions: false,
  handleValuesChange: (values, fieldsChanged) => {
    if (initializingForm.value) {
      return;
    }
    markUnsavedChanges();
    if (
      fieldsChanged.includes('subCommissionType') &&
      values.subCommissionType !== formData.value.subCommissionType
    ) {
      formData.value.subCommissionType = values.subCommissionType;
      handleChangeSubCommissionType();
    }
    if (
      fieldsChanged.includes('specType') &&
      values.specType !== formData.value.specType
    ) {
      formData.value.specType = values.specType;
      handleChangeSpec();
    }
  },
});

const [ProductPropertyAddFormModal, productPropertyAddFormApi] = useVbenModal({
  connectedComponent: ProductPropertyAddForm,
  destroyOnClose: true,
});

const [DeliveryForm, deliveryFormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useDeliveryFormSchema(),
  showDefaultActions: false,
  handleValuesChange: markUnsavedChanges,
});

const [DescriptionForm, descriptionFormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 120,
  },
  layout: 'vertical',
  schema: useDescriptionFormSchema(),
  showDefaultActions: false,
  handleValuesChange: markUnsavedChanges,
});

const [OtherForm, otherFormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useOtherFormSchema(),
  showDefaultActions: false,
  handleValuesChange: markUnsavedChanges,
});

/** tab 切换 */
function handleTabChange(key: string) {
  activeTabName.value = key;
}

/** 标记表单存在待保存的修改 */
function markUnsavedChanges() {
  if (initializingForm.value) {
    return;
  }
  changeVersion.value += 1;
  hasUnsavedChanges.value = true;
}

/** 转换表单值为接口提交格式 */
function prepareSubmissionValues(values: MallSpuApi.Spu): MallSpuApi.Spu {
  const preparedValues = {
    ...values,
    skus: formData.value.skus!.map((item) => ({
      ...item,
      name: values.name,
      price: convertToInteger(item.price),
      marketPrice: convertToInteger(item.marketPrice),
      costPrice: convertToInteger(item.costPrice),
      firstBrokeragePrice: convertToInteger(item.firstBrokeragePrice),
      secondBrokeragePrice: convertToInteger(item.secondBrokeragePrice),
    })),
    sliderPicUrls: (values.sliderPicUrls ?? []).map((item: any) =>
      typeof item === 'object' ? item.url : item,
    ),
  };
  return preparedValues;
}

/** 提交表单 */
async function handleSubmit() {
  if (
    formLoading.value ||
    detailLoadFailed.value ||
    !hasUnsavedChanges.value ||
    submitLoading.value
  ) {
    return;
  }
  submitLoading.value = true;
  const submittedChangeVersion = changeVersion.value;
  try {
    const values: MallSpuApi.Spu = await infoFormApi
      .merge(skuFormApi)
      .merge(deliveryFormApi)
      .merge(descriptionFormApi)
      .merge(otherFormApi)
      .submitAllForm(true);
    // 校验商品名称不能为空（用于 SKU name）
    if (!values.name || values.name.trim() === '') {
      message.error('商品名称不能为空');
      return;
    }
    try {
      // 校验 sku
      skuListRef.value.validateSku();
    } catch {
      message.error('【库存价格】不完善，请填写相关信息');
      return;
    }
    const preparedValues = prepareSubmissionValues(values);

    if (savedPayloadSnapshot.value === JSON.stringify(preparedValues)) {
      hasUnsavedChanges.value = false;
      return;
    }

    const savedSpuId = await withOperationFeedback(() =>
      spuId.value ? updateSpu(preparedValues) : createSpu(preparedValues),
    );
    if (!spuId.value) {
      spuId.value = savedSpuId;
    }
    savedPayloadSnapshot.value = JSON.stringify(preparedValues);
    if (changeVersion.value === submittedChangeVersion) {
      hasUnsavedChanges.value = false;
    }
  } finally {
    submitLoading.value = false;
  }
}

/** 获得详情 */
async function getDetail() {
  if (isDetail.value) {
    isDetail.value = true;
    infoFormApi.setDisabled(true);
    skuFormApi.setDisabled(true);
    deliveryFormApi.setDisabled(true);
    descriptionFormApi.setDisabled(true);
    otherFormApi.setDisabled(true);
  }
  // 将 SKU 的属性，整理成 PropertyAndValues 数组
  propertyList.value = getPropertyList(formData.value);
  detailLoadFailed.value = false;
  savedPayloadSnapshot.value = null;
  formLoading.value = true;
  try {
    const res = await getSpu(spuId.value!);
    // 金额转换：分转元
    res.skus = res.skus?.map((item) => ({
      ...item,
      price: Number(formatToFraction(item.price)),
      marketPrice: Number(formatToFraction(item.marketPrice)),
      costPrice: Number(formatToFraction(item.costPrice)),
      firstBrokeragePrice: Number(formatToFraction(item.firstBrokeragePrice)),
      secondBrokeragePrice: Number(formatToFraction(item.secondBrokeragePrice)),
    }));
    initializingForm.value = true;
    formData.value = res;
    // 将 SKU 的属性，整理成 PropertyAndValues 数组
    propertyList.value = getPropertyList(formData.value);
    // Card 的 loading 骨架不会渲染默认插槽，需先关闭骨架让表单完成挂载。
    formLoading.value = false;
    await nextTick();
    // 初始化各表单值
    await Promise.all([
      infoFormApi.setValues(res),
      skuFormApi.setValues(res),
      deliveryFormApi.setValues(res),
      descriptionFormApi.setValues(res),
      otherFormApi.setValues(res),
    ]);
    await nextTick();
    await nextTick();
    const initialValues = (await infoFormApi
      .merge(skuFormApi)
      .merge(deliveryFormApi)
      .merge(descriptionFormApi)
      .merge(otherFormApi)
      .getValues()) as MallSpuApi.Spu;
    savedPayloadSnapshot.value = JSON.stringify(
      prepareSubmissionValues(initialValues),
    );
    hasUnsavedChanges.value = false;
  } catch {
    detailLoadFailed.value = true;
    hasUnsavedChanges.value = false;
    message.error('商品详情加载失败，请重试');
  } finally {
    initializingForm.value = false;
    formLoading.value = false;
  }
}

// =========== sku form 逻辑 ===========

/** 打开属性添加表单 */
function openPropertyAddForm() {
  productPropertyAddFormApi.open();
}

/** 调用 SkuList generateTableData 方法*/
function generateSkus(propertyList: PropertyAndValues[]) {
  skuListRef.value.generateTableData(propertyList);
}

/** 分销类型 */
function handleChangeSubCommissionType() {
  // 默认为零，类型切换后也要重置为零
  for (const item of formData.value.skus!) {
    item.firstBrokeragePrice = 0;
    item.secondBrokeragePrice = 0;
  }
}

/** 选择规格 */
function handleChangeSpec() {
  // 重置商品属性列表
  propertyList.value = [];
  // 重置 sku 列表
  formData.value.skus = [
    {
      name: '', // SKU 名称，提交时会自动使用 SPU 名称
      price: 0,
      marketPrice: 0,
      costPrice: 0,
      barCode: '',
      picUrl: '',
      stock: 0,
      weight: 0,
      volume: 0,
      firstBrokeragePrice: 0,
      secondBrokeragePrice: 0,
    },
  ];
}

/** 监听 sku form schema 变化，更新表单 */
watch(
  propertyList,
  () => {
    skuFormApi.updateSchema(
      useSkuFormSchema(propertyList.value, isDetail.value),
    );
  },
  { deep: true },
);

// SKU 表格直接修改 formData，表单组件的变更回调无法覆盖这类输入。
watch(formData, markUnsavedChanges, { deep: true });

/** 初始化 */
onMounted(async () => {
  spuId.value = params.id as unknown as number;
  if (!spuId.value) {
    return;
  }
  await getDetail();
});
</script>

<template>
  <div>
    <ProductPropertyAddFormModal :property-list="propertyList" />

    <Page auto-content-height>
      <Card
        class="h-full w-full"
        :loading="formLoading"
        :tab-list="[
          {
            key: 'info',
            tab: '基础设置',
          },
          {
            key: 'sku',
            tab: '价格库存',
          },
          {
            key: 'delivery',
            tab: '物流设置',
          },
          {
            key: 'description',
            tab: '商品详情',
          },
          {
            key: 'other',
            tab: '其它设置',
          },
        ]"
        :active-key="activeTabName"
        @tab-change="handleTabChange"
      >
        <Alert
          v-if="detailLoadFailed"
          class="mb-4"
          message="商品详情加载失败"
          description="请重试后再编辑和保存商品"
          type="error"
          show-icon
        >
          <template #action>
            <Button size="small" @click="getDetail">重试</Button>
          </template>
        </Alert>
        <template #tabBarExtraContent>
          <Button
            type="primary"
            v-if="!isDetail"
            :disabled="
              formLoading ||
              detailLoadFailed ||
              !hasUnsavedChanges ||
              submitLoading
            "
            :loading="submitLoading"
            @click="handleSubmit"
          >
            保存
          </Button>
          <Button type="default" v-else @click="() => closeCurrentTab()">
            返回列表
          </Button>
        </template>

        <InfoForm class="w-3/5" v-show="activeTabName === 'info'" />
        <SkuForm class="w-full" v-show="activeTabName === 'sku'">
          <template #singleSkuList>
            <SkuList
              ref="skuListRef"
              class="w-full"
              :is-detail="isDetail"
              :prop-form-data="formData"
              :property-list="propertyList"
              :rule-config="ruleConfig"
            />
          </template>
          <template #productAttributes>
            <div>
              <Button class="mb-10px mr-15px" @click="openPropertyAddForm">
                添加属性
              </Button>
              <ProductAttributes
                :is-detail="isDetail"
                :property-list="propertyList"
                @success="generateSkus"
              />
            </div>
          </template>
          <template #batchSkuList>
            <SkuList
              :is-batch="true"
              :is-detail="isDetail"
              :prop-form-data="formData"
              :property-list="propertyList"
            />
          </template>
          <template #multiSkuList>
            <SkuList
              ref="skuListRef"
              :is-detail="isDetail"
              :prop-form-data="formData"
              :property-list="propertyList"
              :rule-config="ruleConfig"
            />
          </template>
        </SkuForm>
        <DeliveryForm class="w-3/5" v-show="activeTabName === 'delivery'" />
        <DescriptionForm
          class="w-3/5"
          v-show="activeTabName === 'description'"
        />
        <OtherForm class="w-3/5" v-show="activeTabName === 'other'" />
      </Card>
    </Page>
  </div>
</template>
<style lang="scss" scoped>
:deep(.ant-tabs-tab-btn) {
  font-size: 14px !important;
}
</style>
