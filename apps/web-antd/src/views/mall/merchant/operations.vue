<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';
import type { UploadRequestOption } from 'ant-design-vue/lib/vc-upload/interface';

import type { MerchantWorkbenchApi } from '#/api/merchant/workbench';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button as AButton,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Modal as AModal,
  Select as ASelect,
  Switch as ASwitch,
  Table as ATable,
  TabPane as ATabPane,
  Tabs as ATabs,
  Textarea as ATextarea,
  Upload as AUpload,
  message,
  Upload,
} from 'ant-design-vue';

import {
  buildMerchantProductPayload,
  buildMerchantProductUpdatePayload,
} from '#/api/merchant/product-form';
import {
  agreeMerchantAfterSale,
  createMerchantBrand,
  createMerchantProduct,
  deliverMerchantOrder,
  disagreeMerchantAfterSale,
  getMerchantAfterSalePage,
  getMerchantBrandPage,
  getMerchantOrderPage,
  getMerchantProductCategories,
  getMerchantProductDetail,
  getMerchantProductPage,
  receiveMerchantAfterSale,
  refuseMerchantAfterSale,
  updateMerchantBrand,
  updateMerchantProduct,
  updateMerchantProductStatus,
  uploadMerchantProductImage,
} from '#/api/merchant/workbench';

type WorkbenchTab = 'after-sales' | 'brands' | 'orders' | 'products';

const activeTab = ref<WorkbenchTab>('products');
const loading = ref(false);
const rows = ref<Record<string, any>[]>([]);
const total = ref(0);
const pageNo = ref(1);
const pageSize = ref(10);
const deliveryOpen = ref(false);
const deliverySaving = ref(false);
const deliveryRow = ref<MerchantWorkbenchApi.Order | null>(null);
const deliveryForm = reactive({
  logisticsId: undefined as number | undefined,
  logisticsNo: '',
});
const afterSaleOpen = ref(false);
const afterSaleSaving = ref(false);
const afterSaleAction = ref<'disagree' | 'refuse'>('disagree');
const afterSaleRow = ref<MerchantWorkbenchApi.AfterSale | null>(null);
const afterSaleReason = ref('');
const productOpen = ref(false);
const productSaving = ref(false);
const productId = ref<number>();
const originalProduct = ref<MerchantWorkbenchApi.Product>();
const productSkus = ref<Array<{ label: string; price: number; stock: number }>>(
  [],
);
const productCategories = ref<MerchantWorkbenchApi.Category[]>([]);
const merchantBrands = ref<MerchantWorkbenchApi.Brand[]>([]);
const productForm = reactive({
  name: '',
  categoryId: undefined as number | undefined,
  brandId: undefined as number | undefined,
  price: undefined as number | undefined,
  stock: 0,
  imageUrl: '',
  description: '',
});
const brandOpen = ref(false);
const brandSaving = ref(false);
const brandId = ref<number>();
const brandForm = reactive({
  name: '',
  picUrl: '',
  sort: 0,
  description: '',
  status: 0,
});

const tabs: Array<{ key: WorkbenchTab; label: string }> = [
  { key: 'products', label: '商品' },
  { key: 'brands', label: '品牌' },
  { key: 'orders', label: '履约订单' },
  { key: 'after-sales', label: '售后' },
];

const columns: Record<
  WorkbenchTab,
  Array<{ dataIndex?: string; key: string; title: string }>
> = {
  products: [
    { key: 'name', title: '商品名称', dataIndex: 'name' },
    { key: 'status', title: '状态', dataIndex: 'status' },
    { key: 'price', title: '价格', dataIndex: 'price' },
    { key: 'salesCount', title: '销量', dataIndex: 'salesCount' },
    { key: 'createTime', title: '创建时间', dataIndex: 'createTime' },
    { key: 'actions', title: '操作' },
  ],
  brands: [
    { key: 'name', title: '品牌名称', dataIndex: 'name' },
    { key: 'status', title: '状态', dataIndex: 'status' },
    { key: 'sort', title: '排序', dataIndex: 'sort' },
    { key: 'description', title: '品牌描述', dataIndex: 'description' },
    { key: 'actions', title: '操作' },
  ],
  orders: [
    { key: 'no', title: '履约单号', dataIndex: 'no' },
    { key: 'status', title: '履约状态', dataIndex: 'status' },
    { key: 'productCount', title: '商品数', dataIndex: 'productCount' },
    { key: 'payPrice', title: '实付金额', dataIndex: 'payPrice' },
    { key: 'deliveryTime', title: '发货时间', dataIndex: 'deliveryTime' },
    { key: 'actions', title: '操作' },
  ],
  'after-sales': [
    { key: 'no', title: '售后单号', dataIndex: 'no' },
    { key: 'status', title: '售后状态', dataIndex: 'status' },
    { key: 'orderNo', title: '订单号', dataIndex: 'orderNo' },
    { key: 'spuName', title: '商品', dataIndex: 'spuName' },
    { key: 'refundPrice', title: '退款金额', dataIndex: 'refundPrice' },
    { key: 'actions', title: '操作' },
  ],
};

let listRequest = 0;

async function load() {
  const request = ++listRequest;
  loading.value = true;
  try {
    const params = { pageNo: pageNo.value, pageSize: pageSize.value };
    const result =
      activeTab.value === 'products'
        ? await getMerchantProductPage(params)
        : activeTab.value === 'brands'
          ? await getMerchantBrandPage(params)
          : activeTab.value === 'orders'
            ? await getMerchantOrderPage(params)
            : await getMerchantAfterSalePage(params);
    if (request !== listRequest) return;
    rows.value = result.list;
    total.value = result.total;
  } catch {
    if (request !== listRequest) return;
    rows.value = [];
    total.value = 0;
    message.error('数据加载失败，请稍后重试');
  } finally {
    if (request === listRequest) loading.value = false;
  }
}

async function loadProductOptions() {
  const [categories, brands] = await Promise.all([
    getMerchantProductCategories(),
    getMerchantBrandPage({ pageNo: 1, pageSize: 200 }),
  ]);
  productCategories.value = categories;
  merchantBrands.value = brands.list;
}

function switchTab(key: number | string) {
  const tab = tabs.find((item) => item.key === key);
  if (!tab) return;
  activeTab.value = tab.key;
  pageNo.value = 1;
  void load();
}

function resetProductForm() {
  productId.value = undefined;
  originalProduct.value = undefined;
  productSkus.value = [];
  Object.assign(productForm, {
    name: '',
    categoryId: undefined,
    brandId: undefined,
    price: undefined,
    stock: 0,
    imageUrl: '',
    description: '',
  });
}

async function openProduct(row?: MerchantWorkbenchApi.Product) {
  try {
    resetProductForm();
    if (row?.id) {
      productId.value = row.id;
      const detail = await getMerchantProductDetail(row.id);
      originalProduct.value = detail;
      productSkus.value = (detail.skus ?? []).map((sku, index) => ({
        label:
          sku.properties
            ?.map((item: { valueName?: string }) => item.valueName)
            .join(' / ') || `规格 ${index + 1}`,
        price: (sku.price ?? 0) / 100,
        stock: sku.stock ?? 0,
      }));
      const sku = detail.skus?.[0];
      Object.assign(productForm, {
        name: detail.name || '',
        categoryId: detail.categoryId,
        brandId: detail.brandId,
        price: sku?.price === undefined ? undefined : sku.price / 100,
        stock: sku?.stock ?? 0,
        imageUrl: detail.picUrl || '',
        description: detail.description || '',
      });
    }
    productOpen.value = true;
  } catch {
    message.error('商品资料加载失败');
  }
}

function beforeProductImageUpload(file: File) {
  if (!/\.(jpe?g|png|bmp)$/i.test(file.name)) {
    message.error('商品图片仅支持 JPG、PNG 或 BMP');
    return Upload.LIST_IGNORE;
  }
  if (file.size > 3 * 1024 * 1024) {
    message.error('商品图片不能超过 3MB');
    return Upload.LIST_IGNORE;
  }
  return true;
}

async function saveProduct() {
  try {
    const values = {
      brandId: productForm.brandId!,
      categoryId: productForm.categoryId!,
      description: productForm.description,
      imageUrl: productForm.imageUrl,
      name: productForm.name,
      price: productForm.price!,
      stock: productForm.stock,
    };
    const payload = originalProduct.value
      ? buildMerchantProductUpdatePayload(
          originalProduct.value,
          values,
          originalProduct.value.specType
            ? productSkus.value
            : [{ price: productForm.price!, stock: productForm.stock }],
        )
      : buildMerchantProductPayload(values);
    productSaving.value = true;
    if (productId.value) {
      await updateMerchantProduct({ ...payload, id: productId.value });
      message.success('商品已更新');
    } else {
      await createMerchantProduct(payload);
      message.success('商品已创建并上架');
    }
    productOpen.value = false;
    await load();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('请')) {
      message.warning(error.message);
    } else {
      message.error('商品保存失败，请检查商品资料后重试');
    }
  } finally {
    productSaving.value = false;
  }
}

function resetBrandForm() {
  brandId.value = undefined;
  Object.assign(brandForm, {
    name: '',
    picUrl: '',
    sort: 0,
    description: '',
    status: 0,
  });
}

function openBrand(row?: MerchantWorkbenchApi.Brand) {
  resetBrandForm();
  if (row?.id) {
    brandId.value = row.id;
    Object.assign(brandForm, row);
  }
  brandOpen.value = true;
}

async function saveBrand() {
  if (!brandForm.name.trim() || !brandForm.picUrl.trim()) {
    message.warning('请填写品牌名称并上传品牌图片');
    return;
  }
  brandSaving.value = true;
  try {
    const payload = {
      ...brandForm,
      name: brandForm.name.trim(),
      picUrl: brandForm.picUrl.trim(),
    };
    if (brandId.value) {
      await updateMerchantBrand({ ...payload, id: brandId.value });
      message.success('品牌已更新');
    } else {
      await createMerchantBrand(payload);
      message.success('品牌已创建');
    }
    brandOpen.value = false;
    await load();
    await loadProductOptions();
  } catch {
    message.error('品牌保存失败，请检查名称和图片后重试');
  } finally {
    brandSaving.value = false;
  }
}

async function uploadImage(
  option: UploadRequestOption,
  target: 'brand' | 'product',
) {
  try {
    const url = await uploadMerchantProductImage(option.file as File);
    if (target === 'product') productForm.imageUrl = url;
    else brandForm.picUrl = url;
    option.onSuccess?.(url);
    message.success('图片已上传');
  } catch (error) {
    option.onError?.(error as Error);
    message.error('图片上传失败');
  }
}

async function toggleProductStatus(row: MerchantWorkbenchApi.Product) {
  if (!row.id) return;
  try {
    await updateMerchantProductStatus({
      id: row.id,
      status: row.status === 1 ? 0 : 1,
    });
    message.success(row.status === 1 ? '商品已下架' : '商品已上架');
    await load();
  } catch {
    message.error('商品状态更新失败');
  }
}

function openDelivery(row: MerchantWorkbenchApi.Order) {
  deliveryRow.value = row;
  deliveryForm.logisticsId = undefined;
  deliveryForm.logisticsNo = '';
  deliveryOpen.value = true;
}

async function submitDelivery() {
  if (
    !deliveryRow.value?.id ||
    !deliveryRow.value.orderId ||
    !deliveryForm.logisticsId
  ) {
    message.warning('请填写物流公司编号');
    return;
  }
  deliverySaving.value = true;
  try {
    await deliverMerchantOrder({
      id: deliveryRow.value.orderId,
      subOrderId: deliveryRow.value.id,
      logisticsId: deliveryForm.logisticsId,
      logisticsNo: deliveryForm.logisticsNo || undefined,
    });
    message.success('已提交发货');
    deliveryOpen.value = false;
    await load();
  } finally {
    deliverySaving.value = false;
  }
}

async function approveAfterSale(row: MerchantWorkbenchApi.AfterSale) {
  if (!row.id) return;
  try {
    await agreeMerchantAfterSale(row.id);
    message.success('已同意售后');
    await load();
  } catch {
    message.error('售后操作失败');
  }
}

function openAfterSaleReason(
  row: MerchantWorkbenchApi.AfterSale,
  action: 'disagree' | 'refuse',
) {
  afterSaleRow.value = row;
  afterSaleAction.value = action;
  afterSaleReason.value = '';
  afterSaleOpen.value = true;
}

async function submitAfterSaleReason() {
  if (!afterSaleRow.value?.id || !afterSaleReason.value.trim()) {
    message.warning('请填写处理意见');
    return;
  }
  afterSaleSaving.value = true;
  try {
    if (afterSaleAction.value === 'disagree') {
      await disagreeMerchantAfterSale({
        id: afterSaleRow.value.id,
        auditReason: afterSaleReason.value.trim(),
      });
    } else {
      await refuseMerchantAfterSale({
        id: afterSaleRow.value.id,
        refuseMemo: afterSaleReason.value.trim(),
      });
    }
    message.success('售后处理完成');
    afterSaleOpen.value = false;
    await load();
  } finally {
    afterSaleSaving.value = false;
  }
}

async function receiveAfterSale(row: MerchantWorkbenchApi.AfterSale) {
  if (!row.id) return;
  try {
    await receiveMerchantAfterSale(row.id);
    message.success('已确认收货');
    await load();
  } catch {
    message.error('售后操作失败');
  }
}

onMounted(() => {
  void load();
  void loadProductOptions().catch(() =>
    message.error('商品分类或品牌加载失败'),
  );
});
</script>

<template>
  <Page auto-content-height>
    <div class="merchant-operations">
      <ATabs :active-key="activeTab" @change="switchTab">
        <ATabPane v-for="tab in tabs" :key="tab.key" :tab="tab.label" />
      </ATabs>
      <div class="table-toolbar">
        <AButton
          v-if="activeTab === 'products'"
          type="primary"
          @click="openProduct()"
        >
          新建商品
        </AButton>
        <AButton
          v-else-if="activeTab === 'brands'"
          type="primary"
          @click="openBrand()"
        >
          新建品牌
        </AButton>
      </div>
      <ATable
        :columns="columns[activeTab]"
        :data-source="rows"
        :loading="loading"
        :pagination="{
          current: pageNo,
          pageSize,
          total,
          showSizeChanger: true,
        }"
        row-key="id"
        @change="
          (pagination: TablePaginationConfig) => {
            pageNo = pagination.current || 1;
            pageSize = pagination.pageSize || 10;
            load();
          }
        "
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'price' && activeTab === 'products'">
            ¥{{ ((record.price || 0) / 100).toFixed(2) }}
          </template>
          <template v-if="column.key === 'actions' && activeTab === 'products'">
            <AButton type="link" size="small" @click="openProduct(record)">
              编辑
            </AButton>
            <AButton
              type="link"
              size="small"
              @click="toggleProductStatus(record)"
            >
              {{ record.status === 1 ? '下架' : '上架' }}
            </AButton>
          </template>
          <template
            v-else-if="column.key === 'actions' && activeTab === 'brands'"
          >
            <AButton type="link" size="small" @click="openBrand(record)">
              编辑
            </AButton>
          </template>
          <template
            v-else-if="column.key === 'actions' && activeTab === 'orders'"
          >
            <AButton
              v-if="record.status === 10"
              type="link"
              size="small"
              @click="openDelivery(record)"
            >
              发货
            </AButton>
          </template>
          <template
            v-else-if="column.key === 'actions' && activeTab === 'after-sales'"
          >
            <template v-if="record.status === 10">
              <AButton
                type="link"
                size="small"
                @click="approveAfterSale(record)"
              >
                同意
              </AButton>
              <AButton
                type="link"
                size="small"
                danger
                @click="openAfterSaleReason(record, 'disagree')"
              >
                拒绝
              </AButton>
            </template>
            <template v-else-if="record.status === 30">
              <AButton
                type="link"
                size="small"
                @click="receiveAfterSale(record)"
              >
                确认收货
              </AButton>
              <AButton
                type="link"
                size="small"
                danger
                @click="openAfterSaleReason(record, 'refuse')"
              >
                拒收
              </AButton>
            </template>
          </template>
        </template>
      </ATable>
    </div>
    <AModal
      v-model:open="productOpen"
      :title="productId ? '编辑商品' : '新建商品'"
      :confirm-loading="productSaving"
      width="720px"
      destroy-on-close
      @ok="saveProduct"
    >
      <AForm layout="vertical">
        <AFormItem label="商品名称" required>
          <AInput v-model:value="productForm.name" :maxlength="120" />
        </AFormItem>
        <div class="form-grid">
          <AFormItem label="商品分类" required>
            <ASelect
              v-model:value="productForm.categoryId"
              :options="
                productCategories.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))
              "
              placeholder="请选择启用分类"
            />
          </AFormItem>
          <AFormItem label="品牌" required>
            <ASelect
              v-model:value="productForm.brandId"
              :options="
                merchantBrands.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))
              "
              placeholder="请选择本商家的品牌"
            />
          </AFormItem>
          <AFormItem
            v-if="!originalProduct?.specType"
            label="销售价（元）"
            required
          >
            <AInputNumber
              v-model:value="productForm.price"
              class="w-full"
              :min="0.01"
              :precision="2"
            />
          </AFormItem>
          <AFormItem v-if="!originalProduct?.specType" label="库存" required>
            <AInputNumber
              v-model:value="productForm.stock"
              class="w-full"
              :min="0"
              :precision="0"
            />
          </AFormItem>
        </div>
        <AFormItem v-if="originalProduct?.specType" label="规格价格和库存">
          <div
            v-for="(sku, index) in productSkus"
            :key="index"
            class="form-grid"
          >
            <span>{{ sku.label }}</span>
            <div class="flex gap-2">
              <AInputNumber
                v-model:value="sku.price"
                :min="0.01"
                :precision="2"
                addon-before="¥"
              />
              <AInputNumber
                v-model:value="sku.stock"
                :min="0"
                :precision="0"
                addon-before="库存"
              />
            </div>
          </div>
        </AFormItem>
        <AFormItem label="商品主图" required>
          <div class="image-field">
            <img
              v-if="productForm.imageUrl"
              :src="productForm.imageUrl"
              alt="商品主图"
            />
            <AUpload
              :before-upload="beforeProductImageUpload"
              :custom-request="
                (option: UploadRequestOption) => uploadImage(option, 'product')
              "
              :show-upload-list="false"
            >
              <AButton>上传主图</AButton>
            </AUpload>
          </div>
        </AFormItem>
        <AFormItem label="商品介绍">
          <ATextarea
            v-model:value="productForm.description"
            :rows="4"
            :maxlength="2000"
            show-count
          />
        </AFormItem>
      </AForm>
    </AModal>
    <AModal
      v-model:open="brandOpen"
      :title="brandId ? '编辑品牌' : '新建品牌'"
      :confirm-loading="brandSaving"
      destroy-on-close
      @ok="saveBrand"
    >
      <AForm layout="vertical">
        <AFormItem label="品牌名称" required>
          <AInput v-model:value="brandForm.name" :maxlength="80" />
        </AFormItem>
        <AFormItem label="品牌图片" required>
          <div class="image-field">
            <img
              v-if="brandForm.picUrl"
              :src="brandForm.picUrl"
              alt="品牌图片"
            />
            <AUpload
              :before-upload="beforeProductImageUpload"
              :custom-request="
                (option: UploadRequestOption) => uploadImage(option, 'brand')
              "
              :show-upload-list="false"
            >
              <AButton>上传图片</AButton>
            </AUpload>
          </div>
        </AFormItem>
        <AFormItem label="品牌描述">
          <ATextarea
            v-model:value="brandForm.description"
            :rows="3"
            :maxlength="500"
            show-count
          />
        </AFormItem>
        <AFormItem label="排序">
          <AInputNumber
            v-model:value="brandForm.sort"
            class="w-full"
            :min="0"
            :precision="0"
          />
        </AFormItem>
        <AFormItem label="状态">
          <ASwitch
            :checked="brandForm.status === 0"
            checked-children="启用"
            un-checked-children="停用"
            @change="
              (enabled) => {
                brandForm.status = enabled === true ? 0 : 1;
              }
            "
          />
        </AFormItem>
      </AForm>
    </AModal>
    <AModal
      v-model:open="deliveryOpen"
      title="商家订单发货"
      :confirm-loading="deliverySaving"
      @ok="submitDelivery"
    >
      <AForm layout="vertical">
        <AFormItem label="物流公司编号" required>
          <AInputNumber
            v-model:value="deliveryForm.logisticsId"
            class="w-full"
            :min="1"
          />
        </AFormItem>
        <AFormItem label="物流单号">
          <AInput v-model:value="deliveryForm.logisticsNo" allow-clear />
        </AFormItem>
      </AForm>
    </AModal>
    <AModal
      v-model:open="afterSaleOpen"
      :title="afterSaleAction === 'disagree' ? '拒绝售后' : '拒绝收货'"
      :confirm-loading="afterSaleSaving"
      @ok="submitAfterSaleReason"
    >
      <AForm layout="vertical">
        <AFormItem label="处理意见" required>
          <ATextarea
            v-model:value="afterSaleReason"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </AFormItem>
      </AForm>
    </AModal>
  </Page>
</template>

<style scoped>
.merchant-operations {
  padding: 16px 24px;
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 12px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.image-field {
  display: flex;
  gap: 12px;
  align-items: center;
}

.image-field img {
  width: 72px;
  height: 72px;
  object-fit: cover;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
