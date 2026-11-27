<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
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
}

function editRecord(record: Record<string, any>) {
  Object.assign(form, record as MallSfLogisticsApi.Account, {
    partnerId: '',
    checkWord: '',
  });
}

function reset() {
  Object.assign(form, createDefaultForm(), {
    id: undefined,
    defaultFlag: accounts.value.length === 0,
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
    await saveSfAccount(form);
    message.success('顺丰开放平台接入已保存');
    reset();
    await load();
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height title="顺丰开放平台">
    <Form ref="formRef" layout="vertical" :model="form" class="max-w-6xl">
      <section>
        <h3 class="mb-4 text-base font-medium">账号凭证</h3>
        <div class="grid gap-x-5 md:grid-cols-3">
          <Form.Item
            label="配置名称"
            name="name"
            :rules="[{ required: true, message: '请输入配置名称' }]"
          >
            <Input v-model:value="form.name" />
          </Form.Item>
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
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 0 ? 'green' : 'default'">
            {{ record.status === 0 ? '启用' : '停用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <Button type="link" @click="editRecord(record)">编辑</Button>
        </template>
      </template>
    </Table>
  </Page>
</template>
