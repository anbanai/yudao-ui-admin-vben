<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';

import type { MallMerchantApi } from '#/api/mall/product/merchant';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Button as AButton,
  Checkbox as ACheckbox,
  Empty as AEmpty,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Modal as AModal,
  Space as ASpace,
  Switch as ASwitch,
  Table as ATable,
  Tag as ATag,
  message,
  Modal,
} from 'ant-design-vue';

import {
  deleteMerchantBusinessType,
  getMerchantBusinessTypePage,
  saveMerchantBusinessType,
} from '#/api/mall/product/merchant';

const loading = ref(false);
const saving = ref(false);
const rows = ref<MallMerchantApi.BusinessTypeConfig[]>([]);
const total = ref(0);
const current = ref(1);
const pageSize = ref(10);
const modalOpen = ref(false);
const editing = ref(false);

function createDefaultBusinessType(): MallMerchantApi.BusinessTypeConfig {
  return {
    id: 0,
    code: '',
    name: '',
    enabled: true,
    sort: 0,
    requirements: [],
  };
}

const form = reactive<MallMerchantApi.BusinessTypeConfig>(
  createDefaultBusinessType(),
);

const columns = [
  { title: '编码', dataIndex: 'code', key: 'code', width: 180 },
  { title: '经营类型', dataIndex: 'name', key: 'name', width: 220 },
  { title: '资质要求', key: 'requirements' },
  { title: '状态', key: 'enabled', width: 100 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' as const },
];

const pagination = computed<TablePaginationConfig>(() => ({
  current: current.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => `共 ${count} 条`,
}));

async function load() {
  loading.value = true;
  try {
    const result = await getMerchantBusinessTypePage({
      pageNo: current.value,
      pageSize: pageSize.value,
    });
    rows.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(next: TablePaginationConfig) {
  current.value = next.current ?? 1;
  pageSize.value = next.pageSize ?? 10;
  void load();
}

function openCreate() {
  Object.assign(form, createDefaultBusinessType());
  editing.value = false;
  modalOpen.value = true;
}

function openEdit(row: MallMerchantApi.BusinessTypeConfig) {
  Object.assign(form, {
    ...createDefaultBusinessType(),
    ...row,
    requirements: row.requirements?.map((item) => ({ ...item })) ?? [],
  });
  editing.value = true;
  modalOpen.value = true;
}

function addRequirement() {
  form.requirements.push({
    code: '',
    name: '',
    required: true,
    certificateNoRequired: false,
    certificateNoPattern: '',
    validityRequired: false,
    enabled: true,
    sort: 0,
  });
}

function removeRequirement(index: number) {
  form.requirements.splice(index, 1);
}

async function handleSave() {
  if (!form.code.trim() || !form.name.trim()) {
    message.warning('请填写经营类型编码和名称');
    return;
  }
  if (
    form.requirements.some((item) => !item.code.trim() || !item.name.trim())
  ) {
    message.warning('请补全资质标识和名称');
    return;
  }
  saving.value = true;
  try {
    await saveMerchantBusinessType({
      ...form,
      id: editing.value ? form.id : undefined,
      requirements: form.requirements.map((item) => ({ ...item })),
    });
    message.success('经营类型已保存');
    modalOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

function handleDelete(row: MallMerchantApi.BusinessTypeConfig) {
  if (!row.id) return;
  Modal.confirm({
    title: '删除经营类型？',
    content: `确认删除“${row.name}”吗？`,
    okType: 'danger',
    onOk: async () => {
      await deleteMerchantBusinessType(row.id!);
      message.success('经营类型已删除');
      await load();
    },
  });
}

function getRequirementNames(type: MallMerchantApi.BusinessTypeConfig) {
  return type.requirements?.map((item) => item.name).join('、') || '-';
}

onMounted(load);
</script>

<template>
  <section class="config-page">
    <div class="toolbar-row">
      <span>维护经营类型及对应的入驻资质要求。</span>
      <AButton type="primary" @click="openCreate">新增经营类型</AButton>
    </div>

    <ATable
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 920 }"
      row-key="id"
      size="middle"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'requirements'">
          {{
            getRequirementNames(record as MallMerchantApi.BusinessTypeConfig)
          }}
        </template>
        <template v-else-if="column.key === 'enabled'">
          <ATag :color="record.enabled === false ? 'default' : 'success'">
            {{ record.enabled === false ? '停用' : '启用' }}
          </ATag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <ASpace>
            <AButton
              type="link"
              size="small"
              @click="openEdit(record as MallMerchantApi.BusinessTypeConfig)"
            >
              编辑
            </AButton>
            <AButton
              type="link"
              danger
              size="small"
              @click="
                handleDelete(record as MallMerchantApi.BusinessTypeConfig)
              "
            >
              删除
            </AButton>
          </ASpace>
        </template>
      </template>
    </ATable>

    <AModal
      v-model:open="modalOpen"
      :confirm-loading="saving"
      :title="editing ? '编辑经营类型' : '新增经营类型'"
      width="760px"
      @ok="handleSave"
    >
      <AForm layout="vertical">
        <div class="base-fields">
          <AFormItem label="经营类型编码" required>
            <AInput v-model:value="form.code" placeholder="例如：FOOD" />
          </AFormItem>
          <AFormItem label="经营类型名称" required>
            <AInput v-model:value="form.name" placeholder="例如：食品经营" />
          </AFormItem>
          <AFormItem label="排序">
            <AInputNumber v-model:value="form.sort" class="w-full" :min="0" />
          </AFormItem>
          <AFormItem label="启用状态">
            <ASwitch
              v-model:checked="form.enabled"
              checked-children="启用"
              un-checked-children="停用"
            />
          </AFormItem>
        </div>

        <div class="requirements-heading">
          <strong>资质要求</strong>
          <AButton size="small" @click="addRequirement">添加要求</AButton>
        </div>
        <AEmpty
          v-if="form.requirements.length === 0"
          description="暂无资质要求"
        />
        <div
          v-for="(requirement, index) in form.requirements"
          :key="index"
          class="requirement-editor"
        >
          <div class="requirement-fields">
            <AFormItem label="资质标识" required>
              <AInput
                v-model:value="requirement.code"
                placeholder="例如：BUSINESS_LICENSE"
              />
            </AFormItem>
            <AFormItem label="资质名称" required>
              <AInput
                v-model:value="requirement.name"
                placeholder="例如：营业执照"
              />
            </AFormItem>
          </div>
          <AFormItem
            label="证件编号校验规则"
            extra="可选，使用 Java 正则表达式；提交申请时由服务端验证。"
          >
            <AInput
              v-model:value="requirement.certificateNoPattern"
              :maxlength="128"
              placeholder="例如：[A-Z0-9]{18}"
            />
          </AFormItem>
          <div class="requirement-options">
            <ACheckbox v-model:checked="requirement.required">
              必须上传
            </ACheckbox>
            <ACheckbox v-model:checked="requirement.certificateNoRequired">
              填写证件编号
            </ACheckbox>
            <ACheckbox v-model:checked="requirement.validityRequired">
              填写有效期
            </ACheckbox>
            <AButton
              type="link"
              danger
              size="small"
              @click="removeRequirement(index)"
            >
              移除
            </AButton>
          </div>
        </div>
      </AForm>
    </AModal>
  </section>
</template>

<style scoped>
.config-page {
  padding-top: 12px;
}

.toolbar-row,
.requirements-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-row > span {
  color: var(--muted-foreground);
}

.base-fields,
.requirement-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.requirement-editor {
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.requirement-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

@media (max-width: 680px) {
  .toolbar-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .base-fields,
  .requirement-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
