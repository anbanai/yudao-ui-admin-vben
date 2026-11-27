<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  message,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import { getSfAccounts, saveSfAccount } from '#/api/mall/trade/logistics/sf';

const accounts = ref<MallSfLogisticsApi.Account[]>([]);
const formRef = ref<FormInstance>();
const saving = ref(false);
const loaded = ref(false);
const hasEnabledDefault = computed(() =>
  accounts.value.some((account) => account.status === 0 && account.defaultFlag),
);

function createDefaultForm(): MallSfLogisticsApi.Account {
  return {
    name: '顺丰开放平台',
    defaultFlag: true,
    status: 0,
  };
}

const form = reactive<MallSfLogisticsApi.Account>(createDefaultForm());
const columns = [
  { title: '配置名称', dataIndex: 'name' },
  { title: 'Partner ID', dataIndex: 'partnerIdMasked' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions', width: 88 },
];

async function load() {
  accounts.value = await getSfAccounts();
  loaded.value = true;
}

function editRecord(record: Record<string, any>) {
  Object.assign(form, {
    id: record.id,
    name: record.name,
    status: record.status,
    defaultFlag: record.status === 0 && record.defaultFlag,
    partnerId: '',
    checkWord: '',
  });
}

function reset() {
  Object.assign(form, createDefaultForm(), {
    id: undefined,
    defaultFlag: !hasEnabledDefault.value,
    partnerId: '',
    checkWord: '',
  });
  formRef.value?.clearValidate();
}

async function save() {
  if (saving.value) return;
  await formRef.value?.validate();
  saving.value = true;
  try {
    await saveSfAccount({
      id: form.id,
      name: form.name.trim(),
      partnerId: form.partnerId?.trim() || undefined,
      checkWord: form.checkWord || undefined,
      defaultFlag: form.status === 0 && form.defaultFlag,
      status: form.status,
    });
    message.success('顺丰开放平台接入已保存');
    form.checkWord = '';
    await load();
    reset();
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height title="顺丰开放平台">
    <Alert
      v-if="loaded && !hasEnabledDefault"
      class="mb-4"
      message="请启用并设置一个默认账号，以使用顺丰发货和退货预约"
      show-icon
      type="warning"
    />
    <Form ref="formRef" layout="vertical" :model="form" class="max-w-6xl">
      <section>
        <h3 class="mb-4 text-base font-medium">账号凭证</h3>
        <div class="grid gap-x-5 md:grid-cols-3">
          <Form.Item
            label="配置名称"
            name="name"
            :rules="[
              { required: true, whitespace: true, message: '请输入配置名称' },
            ]"
          >
            <Input v-model:value="form.name" :maxlength="64" />
          </Form.Item>
          <Form.Item
            label="Partner ID"
            name="partnerId"
            :rules="[
              {
                required: !form.id,
                whitespace: true,
                message: '请输入顺丰开放平台 Partner ID',
              },
            ]"
          >
            <Input
              v-model:value="form.partnerId"
              :maxlength="64"
              :placeholder="form.id ? '已配置，留空则不修改' : ''"
            />
          </Form.Item>
          <Form.Item
            label="校验码"
            name="checkWord"
            :rules="[
              {
                required: !form.id,
                whitespace: true,
                message: '请输入顺丰开放平台校验码',
              },
            ]"
          >
            <Input.Password
              v-model:value="form.checkWord"
              :maxlength="128"
              :placeholder="form.id ? '已配置，留空则不修改' : ''"
            />
          </Form.Item>
        </div>
      </section>

      <div class="flex flex-wrap items-center gap-3 border-t pt-4">
        <Switch
          v-model:checked="form.defaultFlag"
          :disabled="form.status !== 0"
          checked-children="默认账号"
          un-checked-children="普通账号"
        />
        <Switch
          :checked="form.status === 0"
          checked-children="启用"
          un-checked-children="停用"
          @update:checked="
            (checked) => {
              form.status = checked === true ? 0 : 1;
              if (form.status !== 0) form.defaultFlag = false;
            }
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
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 0 ? 'green' : 'default'">
            {{ record.status === 0 ? '启用' : '停用' }}
          </Tag>
          <Tag v-if="record.status === 0 && record.defaultFlag" color="blue">
            默认
          </Tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <Button type="link" @click="editRecord(record)">编辑</Button>
        </template>
      </template>
    </Table>
  </Page>
</template>
