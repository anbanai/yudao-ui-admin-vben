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

import { Button, Card, message, Select } from 'ant-design-vue';
import draggable from 'vuedraggable';

import { useVbenForm } from '#/adapter/form';
import { createSpu, getSpu, updateSpu } from '#/api/mall/product/spu';
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
import PromotionPanel from '../components/promotion-panel.vue';

const spuId = ref<number>();
const { params, name } = useRoute();
const { closeCurrentTab } = useTabs();
const activeTabName = ref('info');
const formLoading = ref(false); // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const isDetail = ref(name === 'ProductSpuDetail'); // 是否查看详情
const initializingForm = ref(false); // 详情回填时不触发 SKU 重置逻辑
const skuListRef = ref(); // 商品属性列表 Ref
const promotionOpen = ref(false);

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
  marketingConfig: {
    groups: [],
    memberLevels: [],
    pointRules: [],
    userGroups: [],
    priceSymbol: '¥',
    skuColumnWidth: 168,
    hideSingleSku: false,
    pointProduct: false,
    pointQuantity: 0,
  },
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
});

/** tab 切换 */
function handleTabChange(key: string) {
  activeTabName.value = key;
}

/** 提交表单 */
async function handleSubmit() {
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
  // 金额转换：元转分
  values.skus = formData.value.skus!.map((item) => ({
    ...item,
    name: values.name,
    price: convertToInteger(item.price),
    marketPrice: convertToInteger(item.marketPrice),
    costPrice: convertToInteger(item.costPrice),
    firstBrokeragePrice: convertToInteger(item.firstBrokeragePrice),
    secondBrokeragePrice: convertToInteger(item.secondBrokeragePrice),
  }));
  // 处理轮播图列表：上传组件可能返回对象或字符串，统一处理成字符串数组
  const newSliderPicUrls: any[] = [];
  values.sliderPicUrls!.forEach((item: any) => {
    // 如果是前端选的图
    typeof item === 'object'
      ? newSliderPicUrls.push(item.url)
      : newSliderPicUrls.push(item);
  });
  values.sliderPicUrls = newSliderPicUrls;
  values.marketingConfig = {
    ...formData.value.marketingConfig,
    ...values.marketingConfig,
  };

  // 提交数据
  await (spuId.value ? updateSpu(values) : createSpu(values));
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
  formLoading.value = true;
  try {
    const res = await getSpu(spuId.value!);
    res.marketingConfig = {
      groups: [],
      memberLevels: [],
      pointRules: [],
      userGroups: [],
      priceSymbol: '¥',
      skuColumnWidth: 168,
      hideSingleSku: false,
      pointProduct: false,
      pointQuantity: 0,
      ...res.marketingConfig,
    };
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
    // 初始化各表单值
    void infoFormApi.setValues(res);
    void skuFormApi.setValues(res);
    void deliveryFormApi.setValues(res);
    void descriptionFormApi.setValues(res);
    void otherFormApi.setValues(res);
    await nextTick();
    await nextTick();
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
        <template #tabBarExtraContent>
          <Button type="primary" v-if="!isDetail" @click="handleSubmit">
            保存
          </Button>
          <Button v-if="spuId" @click="promotionOpen = true">推广</Button>
          <Button type="default" v-else @click="() => closeCurrentTab()">
            返回列表
          </Button>
        </template>

        <div v-show="activeTabName === 'info'" class="w-3/5">
          <InfoForm />
          <div class="mt-4 rounded border p-4">
            <div class="mb-2 font-medium">轮播图排序</div>
            <draggable v-model="formData.sliderPicUrls" :item-key="(item: any) => typeof item === 'string' ? item : item.url" class="flex flex-wrap gap-2" :disabled="isDetail">
              <template #item="{ element, index }">
                <div class="relative h-20 w-20 overflow-hidden rounded border" :title="`第 ${index + 1} 张`">
                  <img :src="typeof element === 'string' ? element : element.url" class="h-full w-full object-cover" />
                  <span class="absolute bottom-0 left-0 bg-black/60 px-1 text-xs text-white">{{ index + 1 }}</span>
                </div>
              </template>
            </draggable>
          </div>
        </div>
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
        <div v-show="activeTabName === 'other'" class="w-3/5">
          <OtherForm />
          <div class="mt-4 rounded border p-4">
            <div class="mb-3 font-medium">营销与展示</div>
            <div class="grid grid-cols-2 gap-3">
              <label>商品分组<Select v-model:value="formData.marketingConfig!.groups" mode="tags" class="w-full" /></label>
              <label>预售周期（天）<input v-model.number="formData.marketingConfig!.preSaleDays" type="number" min="0" class="form-input" /></label>
              <label>限购数量<input v-model.number="formData.marketingConfig!.purchaseLimit" type="number" min="0" class="form-input" /></label>
              <label>价格符号<input v-model="formData.marketingConfig!.priceSymbol" class="form-input" maxlength="3" /></label>
              <label>规格展示宽度<input v-model.number="formData.marketingConfig!.skuColumnWidth" type="number" min="80" max="360" class="form-input" /></label>
              <label class="flex items-center gap-2"><input v-model="formData.marketingConfig!.hideSingleSku" type="checkbox" />隐藏单规格</label>
              <label class="flex items-center gap-2"><input v-model="formData.marketingConfig!.pointProduct" type="checkbox" />积分商品</label>
              <label>兑换积分<input v-model.number="formData.marketingConfig!.pointQuantity" type="number" min="0" class="form-input" /></label>
              <label>会员等级<Select v-model:value="formData.marketingConfig!.memberLevels" mode="tags" class="w-full" /></label>
              <label>积分规则<Select v-model:value="formData.marketingConfig!.pointRules" mode="tags" class="w-full" /></label>
              <label>人群项<Select v-model:value="formData.marketingConfig!.userGroups" mode="tags" class="w-full" /></label>
            </div>
          </div>
        </div>
      </Card>
    </Page>
    <PromotionPanel v-model="promotionOpen" :spu-id="spuId" />
  </div>
</template>
<style lang="scss" scoped>
:deep(.ant-tabs-tab-btn) {
  font-size: 14px !important;
}
</style>
