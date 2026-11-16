<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';

import type { SfPaperSpecValue } from '../paper-spec';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import { getSfAccounts, saveSfAccount } from '#/api/mall/trade/logistics/sf';

import {
  DEFAULT_SF_PAPER_SPEC,
  getSfPaperSpec,
  SF_PAPER_SPEC_OPTIONS,
  toSfPaperSpecValue,
} from '../paper-spec';

const PRODUCT_OPTIONS = [
  { label: '顺丰特快', value: '1' },
  { label: '顺丰标快', value: '2' },
];

const accounts = ref<MallSfLogisticsApi.Account[]>([]);
const formRef = ref<FormInstance>();
const saving = ref(false);

function createDefaultForm(): MallSfLogisticsApi.Account {
  return {
    name: '顺丰月结账号',
    serviceCode: '1',
    senderName: '',
    senderPhone: '',
    senderProvince: '',
    senderCity: '',
    senderDistrict: '',
    senderAddress: '',
    defaultWeightKg: 1,
    paperWidthMm: DEFAULT_SF_PAPER_SPEC.widthMm,
    paperHeightMm: DEFAULT_SF_PAPER_SPEC.heightMm,
    dpi: 203,
    defaultFlag: true,
    status: 0,
  };
}

const form = reactive<MallSfLogisticsApi.Account>(createDefaultForm());
const columns = [
  { title: '配置名称', dataIndex: 'name' },
  { title: 'Partner ID', dataIndex: 'partnerIdMasked' },
  { title: '月结卡', dataIndex: 'monthlyCardMasked' },
  { title: '寄件产品', key: 'serviceCode' },
  { title: '面单纸张', key: 'paperSpec' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions', width: 88 },
];

const paperSpecValue = computed<SfPaperSpecValue>({
  get: () =>
    toSfPaperSpecValue(form.paperWidthMm, form.paperHeightMm) ??
    DEFAULT_SF_PAPER_SPEC.value,
  set: (value) => {
    const spec = getSfPaperSpec(value);
    form.paperWidthMm = spec.widthMm;
    form.paperHeightMm = spec.heightMm;
    form.dpi = spec.dpi;
  },
});

function productLabel(code: string) {
  return PRODUCT_OPTIONS.find((item) => item.value === code)?.label ?? code;
}

async function load() {
  accounts.value = await getSfAccounts();
}

function editRecord(record: Record<string, any>) {
  Object.assign(form, record as MallSfLogisticsApi.Account, {
    partnerId: '',
    checkWord: '',
    monthlyCard: '',
  });
}

function reset() {
  Object.assign(form, createDefaultForm(), {
    id: undefined,
    defaultFlag: accounts.value.length === 0,
    partnerId: '',
    checkWord: '',
    monthlyCard: '',
  });
  formRef.value?.clearValidate();
}

async function save() {
  if (saving.value) return;
  await formRef.value?.validate();
  saving.value = true;
  try {
    await saveSfAccount(form);
    message.success('顺丰账号已保存');
    reset();
    await load();
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height title="顺丰账号">
    <Form ref="formRef" layout="vertical" :model="form" class="max-w-6xl">
      <section>
        <h3 class="mb-4 text-base font-medium">账号凭证</h3>
        <div class="grid gap-x-5 md:grid-cols-3">
          <Form.Item
            label="Partner ID"
            name="partnerId"
            :rules="[
              {
                required: !form.id,
                message: '请输入顺丰开放平台 Partner ID',
              },
            ]"
          >
            <Input
              v-model:value="form.partnerId"
              :placeholder="form.id ? '已配置，留空则不修改' : ''"
            />
          </Form.Item>
          <Form.Item
            label="校验码"
            name="checkWord"
            :rules="[
              { required: !form.id, message: '请输入顺丰开放平台校验码' },
            ]"
          >
            <Input.Password
              v-model:value="form.checkWord"
              :placeholder="form.id ? '已配置，留空则不修改' : ''"
            />
          </Form.Item>
          <Form.Item
            label="月结卡号"
            name="monthlyCard"
            :rules="[
              { required: !form.id, message: '请输入已签约的顺丰月结卡号' },
            ]"
          >
            <Input.Password
              v-model:value="form.monthlyCard"
              :placeholder="form.id ? '已配置，留空则不修改' : ''"
            />
          </Form.Item>
        </div>
      </section>

      <Divider />

      <section>
        <h3 class="mb-4 text-base font-medium">寄件设置</h3>
        <div class="grid gap-x-5 md:grid-cols-3">
          <Form.Item label="寄件产品" name="serviceCode" required>
            <Select
              v-model:value="form.serviceCode"
              :options="PRODUCT_OPTIONS"
            />
          </Form.Item>
          <Form.Item label="面单纸张" required>
            <Select
              v-model:value="paperSpecValue"
              :options="SF_PAPER_SPEC_OPTIONS"
            />
          </Form.Item>
          <Form.Item
            label="默认包裹重量（kg）"
            name="defaultWeightKg"
            :rules="[{ required: true, message: '请输入默认包裹重量' }]"
          >
            <InputNumber
              v-model:value="form.defaultWeightKg"
              :min="0.001"
              :precision="3"
              class="w-full"
            />
          </Form.Item>
        </div>
      </section>

      <Divider />

      <section>
        <h3 class="mb-4 text-base font-medium">发件信息</h3>
        <div class="grid gap-x-5 md:grid-cols-3">
          <Form.Item
            label="发件人"
            name="senderName"
            :rules="[{ required: true, message: '请输入发件人' }]"
          >
            <Input v-model:value="form.senderName" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="senderPhone"
            :rules="[{ required: true, message: '请输入手机号' }]"
          >
            <Input v-model:value="form.senderPhone" />
          </Form.Item>
          <Form.Item
            label="省"
            name="senderProvince"
            :rules="[{ required: true, message: '请输入省份' }]"
          >
            <Input v-model:value="form.senderProvince" />
          </Form.Item>
          <Form.Item
            label="市"
            name="senderCity"
            :rules="[{ required: true, message: '请输入城市' }]"
          >
            <Input v-model:value="form.senderCity" />
          </Form.Item>
          <Form.Item label="区县">
            <Input v-model:value="form.senderDistrict" />
          </Form.Item>
          <Form.Item
            label="详细地址"
            name="senderAddress"
            :rules="[{ required: true, message: '请输入详细地址' }]"
          >
            <Input v-model:value="form.senderAddress" />
          </Form.Item>
        </div>
      </section>

      <div class="flex flex-wrap items-center gap-3 border-t pt-4">
        <Switch
          v-model:checked="form.defaultFlag"
          checked-children="默认账号"
          un-checked-children="普通账号"
        />
        <Switch
          :checked="form.status === 0"
          checked-children="启用"
          un-checked-children="停用"
          @update:checked="
            (checked) => (form.status = checked === true ? 0 : 1)
          "
        />
        <Button type="primary" :loading="saving" @click="save">保存</Button>
        <Button @click="reset">新建</Button>
      </div>
    </Form>

    <Divider />

    <Table
      row-key="id"
      :data-source="accounts"
      :columns="columns"
      :pagination="false"
      :scroll="{ x: 760 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'serviceCode'">
          {{ productLabel(record.serviceCode) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="record.status === 0 ? 'green' : 'default'">
            {{ record.status === 0 ? '启用' : '停用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'paperSpec'">
          {{ record.paperWidthMm }}×{{ record.paperHeightMm }} mm
        </template>
        <template v-else-if="column.key === 'actions'">
          <Button type="link" @click="editRecord(record)">编辑</Button>
        </template>
      </template>
    </Table>
  </Page>
</template>
