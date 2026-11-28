<script lang="ts" setup>
import type { MallSpuApi } from '#/api/mall/product/spu';
import type { DraftInput, ImportItem } from '#/api/mall/product/youzan-import';
import type {
  PropertyAndValues,
  RuleConfig,
} from '#/views/mall/product/spu/components';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { convertToInteger, formatToFraction } from '@vben/utils';

import { Alert, Button, Card, message, Modal } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createSpu, getSpu, updateSpu } from '#/api/mall/product/spu';
import {
  getProductDraft,
  result as importResult,
  publishProductDraft,
  saveProductDraft,
  supplement,
} from '#/api/mall/product/youzan-import';
import { withOperationFeedback } from '#/utils/operation-feedback';
import { getPropertyList, SkuList } from '#/views/mall/product/spu/components';

import {
  isSkuPropertiesSubset,
  reconcileSkus,
} from '../components/sku-reconcile';
import {
  useDeliveryFormSchema,
  useDescriptionFormSchema,
  useInfoFormSchema,
  useOtherFormSchema,
  useSkuFormSchema,
} from './data';
import ProductAttributes from './modules/product-attributes.vue';
import ProductPropertyAddForm from './modules/product-property-add-form.vue';
import PublishImportDraft from './modules/publish-import-draft.vue';

const { hasAccessByCodes } = useAccess();
const spuId = ref<number>();
const { params, name, query } = useRoute();
const importBatch = String(query.yzBatch ?? '');
const importMerchant = String(query.yzMerchant ?? '');
const importProduct = String(query.yzProduct ?? '');
const importMode = ['yzBatch', 'yzMerchant', 'yzProduct'].some(
  (key) => key in query,
);
const draftMode = importMode && !importMerchant;
const canEditDraft = computed(() =>
  hasAccessByCodes(['product:youzan:import']),
);
const canPublish = computed(
  () =>
    canEditDraft.value &&
    hasAccessByCodes(['product:spu:create']) &&
    hasAccessByCodes(['product:spu:update']),
);
const publishInput = ref<DraftInput>();
const importFinished = ref(false);
const importItems = ref<ImportItem[]>([]);
const sources = ref<Record<string, string>>({});
function signature(sku: MallSpuApi.Sku) {
  return (sku.properties ?? [])
    .map((p) => `${p.propertyId}:${p.valueId}`)
    .toSorted()
    .join(',');
}
function bindSource(sku: MallSpuApi.Sku, event: Event) {
  const source = (event.target as HTMLSelectElement).value;
  sources.value[signature(sku)] = source;
  markUnsavedChanges();
  const item = importItems.value.find((entry) => entry.key.sku === source);
  if (item) {
    sku.price = item.cents === null ? undefined : item.cents / 100;
    sku.stock = item.stock ?? undefined;
  }
}
const { closeCurrentTab } = useTabs();
const activeTabName = ref('info');
const formLoading = ref(Boolean(params.id)); // 表单详情的加载中
const submitLoading = ref(false); // 表单提交的加载中
const descriptionUploading = ref(false); // 商品详情图片上传中
const hasUnsavedChanges = ref(!params.id); // 是否存在待保存的修改
const detailLoadFailed = ref(false); // 商品详情加载是否失败
const changeVersion = ref(0); // 表单变更版本，用于识别保存期间的修改
const savedPayloadSnapshot = ref<null | string>(null);
const isDetail = ref(name === 'ProductSpuDetail'); // 是否查看详情
const initializingForm = ref(false); // 详情回填时不触发 SKU 重置逻辑
const legacySingleSpec = ref(false); // 兼容存量单规格商品，新增商品仍固定为多规格
const propertyChangeVersion = ref(0);
const specVersion = ref(0);
const skuDraftVersion = ref(0);
const skuListRef = ref(); // 商品属性列表 Ref

const formData = ref<MallSpuApi.Spu>({
  name: '',
  categoryId: undefined,
  groupIds: [],
  keyword: '',
  picUrl: '',
  sliderPicUrls: [],
  introduction: '',
  deliveryTypes: [],
  deliveryTemplateId: undefined,
  brandId: undefined,
  specType: true,
  subCommissionType: false,
  isPreSale: false,
  deliveryDays: undefined,
  buyLimit: 0,
  buyLimitLevel: 'ALL',
  pointDiscountRate: 0,
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
  schema: useInfoFormSchema().filter(
    ({ fieldName }) =>
      !draftMode || (fieldName !== 'merchantId' && fieldName !== 'brandId'),
  ),
  showDefaultActions: false,
  handleValuesChange: markUnsavedChanges,
});

const [SkuForm, skuFormApi] = useVbenForm({
  commonConfig: {
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useSkuFormSchema(
    propertyList.value,
    isDetail.value,
    legacySingleSpec.value,
  ),
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
    markUnsavedChanges();
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
  schema: useDescriptionFormSchema(handleDescriptionUploadingChange),
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

/** 更新商品详情图片上传状态 */
function handleDescriptionUploadingChange(uploading: boolean) {
  descriptionUploading.value = uploading;
}

/** 转换表单值为接口提交格式 */
type ProductFormValues = MallSpuApi.Spu & {
  customDeliveryDays?: number;
  deliveryDaysPreset?: 'custom' | number;
};

function prepareSubmissionValues(values: ProductFormValues): MallSpuApi.Spu {
  const { customDeliveryDays, deliveryDaysPreset, ...formValues } = values;
  const money = (value: number | string | undefined) =>
    draftMode && (value === null || value === undefined || value === '')
      ? undefined
      : convertToInteger(value);
  const selectedDays =
    deliveryDaysPreset === 'custom'
      ? customDeliveryDays
      : Number(deliveryDaysPreset);
  const preparedValues = {
    ...formValues,
    specType: formData.value.specType ?? true,
    deliveryDays: formValues.isPreSale ? selectedDays : undefined,
    skus: (formData.value.skus ?? []).map((item) => ({
      ...item,
      name: values.name,
      price: money(item.price),
      marketPrice: money(item.marketPrice),
      costPrice: money(item.costPrice),
      firstBrokeragePrice: money(item.firstBrokeragePrice),
      secondBrokeragePrice: money(item.secondBrokeragePrice),
    })),
    sliderPicUrls: (formValues.sliderPicUrls ?? []).map((item: any) =>
      typeof item === 'object' ? item.url : item,
    ),
  };
  return preparedValues;
}

const formApis = [
  infoFormApi,
  skuFormApi,
  deliveryFormApi,
  descriptionFormApi,
  otherFormApi,
];

async function collectDraft(
  validate: boolean,
): Promise<DraftInput | undefined> {
  if (validate) {
    const validations = await Promise.all(
      formApis.map((api) => api.validate()),
    );
    if (validations.some((validation) => !validation.valid)) {
      message.error('请补齐商品资料后再发布');
      return;
    }
    try {
      skuListRef.value.validateSku();
    } catch {
      message.error('请补齐商品规格、价格和库存');
      return;
    }
  }
  const values = Object.assign(
    {},
    ...(await Promise.all(formApis.map((api) => api.getValues()))),
  );
  const form = prepareSubmissionValues(values);
  delete form.merchantId;
  delete form.id;
  delete form.brandId;
  const sourceByProperties: Record<string, string> = {};
  for (const sku of form.skus ?? []) {
    const key = signature(sku);
    if (sources.value[key]) sourceByProperties[key] = sources.value[key]!;
  }
  if (
    validate &&
    (Object.keys(sourceByProperties).length !== form.skus?.length ||
      new Set(Object.values(sourceByProperties)).size !==
        importItems.value.length ||
      form.skus?.some(
        (sku) =>
          sku.price === null ||
          sku.price === undefined ||
          sku.stock === null ||
          sku.stock === undefined,
      ))
  ) {
    message.error('请为每个来源规格完成绑定，并补齐价格和库存');
    return;
  }
  return {
    batchId: importBatch,
    product: importProduct,
    form,
    sourceByProperties,
  };
}

async function openPublish() {
  if (
    !draftMode ||
    !canPublish.value ||
    importFinished.value ||
    importItems.value.length === 0 ||
    detailLoadFailed.value ||
    initializingForm.value ||
    descriptionUploading.value ||
    submitLoading.value
  )
    return;
  submitLoading.value = true;
  try {
    publishInput.value = await collectDraft(true);
  } finally {
    submitLoading.value = false;
  }
}

async function publish(merchant: string, brandId: number) {
  if (
    !publishInput.value ||
    !canPublish.value ||
    submitLoading.value ||
    importFinished.value
  )
    return;
  submitLoading.value = true;
  try {
    const draft = publishInput.value;
    await withOperationFeedback(() =>
      publishProductDraft(merchant, {
        ...draft,
        form: { ...draft.form, brandId },
      }),
    );
    publishInput.value = undefined;
    importFinished.value = true;
    hasUnsavedChanges.value = false;
  } finally {
    submitLoading.value = false;
  }
}

/** 提交表单 */
async function handleSubmit() {
  if (
    formLoading.value ||
    detailLoadFailed.value ||
    descriptionUploading.value ||
    !hasUnsavedChanges.value ||
    submitLoading.value
  ) {
    return;
  }
  if (
    importMode &&
    (importFinished.value ||
      importItems.value.length === 0 ||
      initializingForm.value)
  )
    return;
  submitLoading.value = true;
  const submittedChangeVersion = changeVersion.value;
  try {
    if (draftMode) {
      if (!canEditDraft.value) return;
      const draft = await collectDraft(false);
      if (draft) {
        await withOperationFeedback(() => saveProductDraft(draft));
        if (changeVersion.value === submittedChangeVersion)
          hasUnsavedChanges.value = false;
      }
      return;
    }
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
    if (
      importBatch &&
      formData.value.skus?.some(
        (sku) =>
          !sources.value[signature(sku)] ||
          sku.price === null ||
          sku.price === undefined ||
          String(sku.price).trim() === '' ||
          sku.stock === null ||
          sku.stock === undefined,
      )
    ) {
      message.error('请为每个来源规格完成绑定，并补齐价格和库存');
      return;
    }
    const preparedValues = prepareSubmissionValues(values);

    if (savedPayloadSnapshot.value === JSON.stringify(preparedValues)) {
      hasUnsavedChanges.value = false;
      return;
    }

    if (importMode) {
      await withOperationFeedback(() =>
        supplement(
          importMerchant,
          importBatch,
          importProduct,
          preparedValues,
          sources.value,
        ),
      );
      importFinished.value = true;
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
  specVersion.value += 1;
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
    res.skus = editableSkus(res.skus);
    legacySingleSpec.value = res.specType === false;
    const normalizedRes: MallSpuApi.Spu = {
      ...res,
      buyLimit: res.buyLimit ?? 0,
      buyLimitLevel: res.buyLimitLevel ?? 'ALL',
      isPreSale: res.isPreSale ?? false,
      pointDiscountRate: res.pointDiscountRate ?? 0,
      specType: res.specType ?? true,
    };
    initializingForm.value = true;
    formData.value = normalizedRes;
    // 将 SKU 的属性，整理成 PropertyAndValues 数组
    propertyList.value = getPropertyList(formData.value);
    // Card 的 loading 骨架不会渲染默认插槽，需先关闭骨架让表单完成挂载。
    formLoading.value = false;
    await nextTick();
    // 初始化各表单值
    await Promise.all([
      infoFormApi.setValues({
        ...normalizedRes,
        deliveryDaysPreset: deliveryPreset(normalizedRes.deliveryDays),
        customDeliveryDays: normalizedRes.deliveryDays,
      }),
      skuFormApi.setValues(normalizedRes),
      deliveryFormApi.setValues(normalizedRes),
      descriptionFormApi.setValues(normalizedRes),
      otherFormApi.setValues(normalizedRes),
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

function deliveryPreset(days?: number) {
  if (!days) return undefined;
  return [3, 5, 7, 15].includes(days) ? days : 'custom';
}

function editableSkus(skus: MallSpuApi.Spu['skus']) {
  const amount = (value: number | string | undefined) =>
    value === null || value === undefined
      ? undefined
      : Number(formatToFraction(value));
  return skus?.map((item) => ({
    ...item,
    price: amount(item.price),
    marketPrice: amount(item.marketPrice),
    costPrice: amount(item.costPrice),
    firstBrokeragePrice: amount(item.firstBrokeragePrice),
    secondBrokeragePrice: amount(item.secondBrokeragePrice),
  }));
}

// =========== sku form 逻辑 ===========

/** 打开属性添加表单 */
function openPropertyAddForm() {
  productPropertyAddFormApi.open();
}

function hasSkuData(sku: MallSpuApi.Sku): boolean {
  const numericValues = [
    sku.price,
    sku.marketPrice,
    sku.costPrice,
    sku.stock,
    sku.weight,
    sku.volume,
    sku.firstBrokeragePrice,
    sku.secondBrokeragePrice,
  ];
  return Boolean(
    sku.id ||
    sku.barCode ||
    sku.picUrl ||
    numericValues.some((value) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue !== 0;
    }),
  );
}

function hasCompleteProperties(list: PropertyAndValues[]): boolean {
  return (
    list.length > 0 &&
    list.every(
      (property) =>
        Array.isArray(property.values) && property.values.length > 0,
    )
  );
}

function confirmDataReset(content: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    Modal.confirm({
      title: '确认清空当前规格数据？',
      content,
      onOk: () => settle(true),
      onCancel: () => settle(false),
    });
  });
}

/** 由父组件统一接收属性变化并对账 SKU。 */
async function handlePropertyChange(nextList: PropertyAndValues[]) {
  let migratingLegacy = false;
  if (legacySingleSpec.value && hasCompleteProperties(nextList)) {
    migratingLegacy = true;
  }
  const requestVersion = ++propertyChangeVersion.value;
  const currentSkus = formData.value.skus ?? [];
  let nextSkus = reconcileSkus(nextList, currentSkus);
  const discardedRows = migratingLegacy
    ? []
    : currentSkus.filter(
        (sku) =>
          !nextSkus.some((nextSku) =>
            isSkuPropertiesSubset(sku.properties, nextSku.properties),
          ) && hasSkuData(sku),
      );

  if (discardedRows.length > 0) {
    const confirmed = await confirmDataReset(
      '删除属性值会移除对应的 SKU 行，已填写的价格、库存等数据将无法恢复。',
    );
    if (requestVersion !== propertyChangeVersion.value) {
      return;
    }
    if (!confirmed) {
      propertyList.value = [...propertyList.value];
      return;
    }
    // 确认期间仍可能编辑保留的 SKU，必须基于最新数据重新对账。
    nextSkus = reconcileSkus(nextList, formData.value.skus ?? []);
  }

  propertyList.value = nextList;
  formData.value.skus = nextSkus;
  if (migratingLegacy) {
    legacySingleSpec.value = false;
    formData.value.specType = true;
  }
  skuDraftVersion.value += 1;
  markUnsavedChanges();
}

/** 分销类型 */
function handleChangeSubCommissionType() {
  // 默认为零，类型切换后也要重置为零
  for (const item of formData.value.skus!) {
    item.firstBrokeragePrice = 0;
    item.secondBrokeragePrice = 0;
  }
}

/** 监听 sku form schema 变化，更新表单 */
watch(
  [propertyList, legacySingleSpec],
  () => {
    skuFormApi.updateSchema(
      useSkuFormSchema(
        propertyList.value,
        isDetail.value,
        legacySingleSpec.value,
      ),
    );
  },
  { deep: true },
);

// SKU 表格直接修改 formData，表单组件的变更回调无法覆盖这类输入。
watch(formData, markUnsavedChanges, { deep: true });

/** 初始化 */
async function initialize() {
  spuId.value = importMode ? undefined : (params.id as unknown as number);
  if (!spuId.value) {
    initializingForm.value = true;
    try {
      await nextTick();
      if (importMode) {
        detailLoadFailed.value = true;
        if (!importBatch || !importProduct || params.id || !canEditDraft.value)
          return;
        const batch = await importResult(
          importMerchant || undefined,
          importBatch,
        );
        if ((batch.merchantId ?? '') !== importMerchant) return;
        const productLines = batch.lines.filter(
          ({ row }) => row.item?.key.product === importProduct,
        );
        if (
          batch.confirmed &&
          productLines.some(({ bindingState }) => bindingState === 'BOUND')
        ) {
          importFinished.value = true;
          return;
        }
        importItems.value = batch.lines.flatMap(({ bindingState, row }) =>
          batch.confirmed &&
          bindingState === 'UNBOUND' &&
          row.item?.key.product === importProduct
            ? [row.item]
            : [],
        );
        if (!importItems.value[0]) return;
        formData.value.name = importItems.value[0].name;
        if (draftMode) {
          const draft = await getProductDraft(importBatch, importProduct);
          if (draft.spuId) {
            importFinished.value = true;
            return;
          }
          if (draft.form) {
            formData.value = {
              ...formData.value,
              ...draft.form,
              specType: draft.form.specType ?? true,
              skus: editableSkus(draft.form.skus) ?? formData.value.skus,
            };
            legacySingleSpec.value = formData.value.specType === false;
            propertyList.value = getPropertyList(formData.value);
            sources.value = { ...draft.sourceByProperties };
          }
        } else {
          formData.value.merchantId = Number(importMerchant);
        }
        detailLoadFailed.value = false;
      }
      await Promise.all([
        infoFormApi.setValues({
          ...formData.value,
          deliveryDaysPreset: deliveryPreset(formData.value.deliveryDays),
          customDeliveryDays: formData.value.deliveryDays,
        }),
        skuFormApi.setValues(formData.value),
        deliveryFormApi.setValues(formData.value),
        descriptionFormApi.setValues(formData.value),
        otherFormApi.setValues(formData.value),
      ]);
    } catch {
      detailLoadFailed.value = true;
      message.error('商品资料加载失败，请重试');
    } finally {
      initializingForm.value = false;
    }
    return;
  }
  await getDetail();
}

onMounted(initialize);
</script>

<template>
  <div>
    <ProductPropertyAddFormModal
      :property-list="propertyList"
      @success="handlePropertyChange"
    />

    <Page auto-content-height>
      <PublishImportDraft
        v-if="publishInput"
        :busy="submitLoading"
        @close="publishInput = undefined"
        @publish="publish"
      />
      <Alert
        v-if="importFinished"
        type="success"
        :message="
          draftMode
            ? '商品已上架，可在商品列表中查看。'
            : '来源商品已绑定。如需改价或调整库存，请从商品列表进入标准编辑页。'
        "
        show-icon
      >
        <template #action>
          <Button @click="() => closeCurrentTab()"> 关闭补资料页 </Button>
        </template>
      </Alert>
      <Card
        v-if="importMode && !importFinished"
        :title="draftMode ? '有赞商品草稿' : '有赞商品补资料（保存后下架）'"
      >
        <p>建立商城规格后，请逐项匹配来源规格。</p>
        <div v-for="item in importItems" :key="item.key.sku">
          {{ item.specification }} ·
          {{
            Object.entries(item.hints)
              .map(([k, v]) => `${k}：${v}`)
              .join('；')
          }}
        </div>
        <label v-for="sku in formData.skus" :key="signature(sku)" class="block">
          {{
            sku.properties?.map((p) => p.valueName).join(' / ') || '商城规格'
          }}
          <select
            :value="sources[signature(sku)] || ''"
            @change="bindSource(sku, $event)"
          >
            <option value="">请选择来源规格</option>
            <option
              v-for="item in importItems"
              :key="item.key.sku"
              :value="item.key.sku"
            >
              {{ item.key.sku }} · {{ item.specification }} ·
              {{
                item.cents === null ? '待补价格' : `${item.cents / 100} 元`
              }}
              /
              {{ item.stock ?? '待补库存' }}
            </option>
          </select>
        </label>
      </Card>
      <Card
        v-if="!importFinished"
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
            <Button v-if="importMode" size="small" @click="initialize">
              重试
            </Button>
            <Button v-else size="small" @click="getDetail">重试</Button>
          </template>
        </Alert>
        <template #tabBarExtraContent>
          <Button
            type="primary"
            v-if="!isDetail"
            :disabled="
              formLoading ||
              detailLoadFailed ||
              descriptionUploading ||
              !hasUnsavedChanges ||
              submitLoading
            "
            :loading="submitLoading"
            @click="handleSubmit"
          >
            {{ draftMode ? '保存草稿' : '保存' }}
          </Button>
          <Button type="default" v-else @click="() => closeCurrentTab()">
            返回列表
          </Button>
          <Button
            v-if="draftMode && canPublish"
            class="ml-2"
            :disabled="
              detailLoadFailed ||
              initializingForm ||
              !importItems.length ||
              descriptionUploading ||
              submitLoading
            "
            @click="openPublish"
          >
            发布上架
          </Button>
        </template>

        <InfoForm class="w-3/5" v-show="activeTabName === 'info'" />
        <SkuForm class="w-full" v-show="activeTabName === 'sku'">
          <template #legacySkuList>
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
              <Button
                v-if="!isDetail"
                class="mb-10px mr-15px"
                @click="openPropertyAddForm"
              >
                添加属性
              </Button>
              <ProductAttributes
                :change-version="specVersion"
                :is-detail="isDetail"
                :property-list="propertyList"
                @change="handlePropertyChange"
              />
            </div>
          </template>
          <template #batchSkuList>
            <SkuList
              :batch-reset-key="skuDraftVersion"
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
