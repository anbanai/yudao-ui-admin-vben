<script lang="ts" setup>
import type { MerchantWorkbenchApi } from '#/api/merchant/workbench';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Tabs,
} from 'ant-design-vue';

import {
  getMerchantSfConfig,
  updateMerchantSfConfig,
} from '#/api/merchant/workbench';

import { SF_PAPER_SPEC_OPTIONS } from '../trade/logistics/sf/paper-spec';
import SfDevices from './modules/sf-devices.vue';
import { createSettingsForm, settingsPayload } from './sf-settings-form';

const config = ref<MerchantWorkbenchApi.SfConfig>();
const form = ref<ReturnType<typeof createSettingsForm>>();
const loading = ref(false);
const saving = ref(false);
const tab = ref('settings');
const paperOptions = computed(() =>
  SF_PAPER_SPEC_OPTIONS.filter((paper) =>
    config.value?.supportedPaperSpecs.includes(paper.value),
  ),
);
const products = [
  { value: '1', label: '顺丰特快' },
  { value: '2', label: '顺丰标快' },
];
const addressFields = [
  { label: '联系人', sender: 'senderName', returns: 'returnName', max: 64 },
  { label: '手机号', sender: 'senderPhone', returns: 'returnPhone', max: 32 },
  { label: '省', sender: 'senderProvince', returns: 'returnProvince', max: 64 },
  { label: '市', sender: 'senderCity', returns: 'returnCity', max: 64 },
  {
    label: '区县',
    sender: 'senderDistrict',
    returns: 'returnDistrict',
    max: 64,
  },
  {
    label: '详细地址',
    sender: 'senderAddress',
    returns: 'returnAddress',
    max: 512,
  },
] as const;

async function load() {
  loading.value = true;
  try {
    const data = await getMerchantSfConfig();
    config.value = data;
    form.value = createSettingsForm(data);
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!form.value || saving.value) return;
  saving.value = true;
  try {
    await updateMerchantSfConfig(settingsPayload(form.value));
    form.value.monthlyCard = '';
    message.success('顺丰发货设置已保存');
    await load();
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>

<template>
  <Page auto-content-height title="顺丰发货设置">
    <Card :loading="loading">
      <Alert v-if="!config" type="warning" message="发货设置加载失败">
        <template #action>
          <Button size="small" @click="load">重新加载</Button>
        </template>
      </Alert>
      <Tabs v-else v-model:active-key="tab">
        <Tabs.TabPane key="settings" tab="发货设置">
          <Form
            v-if="form"
            layout="vertical"
            :model="form"
            class="max-w-4xl"
            @finish="save"
          >
            <h3 class="mb-4 text-base font-medium">结算与寄件</h3>
            <div class="grid gap-x-5 md:grid-cols-2">
              <Form.Item
                label="顺丰月结卡号"
                name="monthlyCard"
                :rules="[
                  {
                    required: !config.monthlyCardMasked,
                    whitespace: true,
                    message: '请输入本店月结卡号',
                  },
                ]"
              >
                <Input.Password
                  v-model:value="form.monthlyCard"
                  autocomplete="new-password"
                  :maxlength="64"
                  :placeholder="
                    config.monthlyCardMasked
                      ? `当前 ${config.monthlyCardMasked}，留空保留`
                      : '请输入本店月结卡号'
                  "
                />
              </Form.Item>
              <Form.Item
                label="默认寄件产品"
                name="serviceCode"
                :rules="[{ required: true }]"
              >
                <Select v-model:value="form.serviceCode" :options="products" />
              </Form.Item>
              <Form.Item
                label="默认包裹重量（kg）"
                name="defaultWeightKg"
                :rules="[{ required: true, message: '请输入默认包裹重量' }]"
              >
                <InputNumber
                  v-model:value="form.defaultWeightKg"
                  :min="0.001"
                  :max="9999999.999"
                  :precision="3"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item
                label="面单纸张"
                name="paperSpec"
                :rules="[
                  {
                    required: paperOptions.length > 0,
                    message: '请选择面单纸张',
                  },
                ]"
              >
                <Select
                  v-model:value="form.paperSpec"
                  :options="paperOptions"
                  :disabled="!paperOptions.length"
                  placeholder="请联系平台开通顺丰面单模板"
                />
              </Form.Item>
            </div>
            <Divider />
            <h3 class="mb-4 text-base font-medium">发件信息</h3>
            <div class="grid gap-x-5 md:grid-cols-2">
              <Form.Item
                v-for="field in addressFields"
                :key="field.sender"
                :name="field.sender"
                :label="field.sender === 'senderName' ? '发件人' : field.label"
                :rules="[
                  {
                    required:
                      form.returnSameAsSender &&
                      field.sender !== 'senderDistrict',
                    whitespace: true,
                    message: `请填写${field.label}`,
                  },
                ]"
              >
                <Input
                  v-model:value="form[field.sender]"
                  :maxlength="field.max"
                />
              </Form.Item>
            </div>
            <Divider />
            <h3 class="mb-4 text-base font-medium">售后退货地址</h3>
            <Checkbox v-model:checked="form.returnSameAsSender" class="mb-4">
              退货地址同发件地址
            </Checkbox>
            <div
              v-if="!form.returnSameAsSender"
              class="grid gap-x-5 md:grid-cols-2"
            >
              <Form.Item
                v-for="field in addressFields"
                :key="field.returns"
                :name="field.returns"
                :label="
                  field.returns === 'returnName' ? '退货收件人' : field.label
                "
                :rules="[
                  {
                    required: field.returns !== 'returnDistrict',
                    whitespace: true,
                    message: `请填写${field.label}`,
                  },
                ]"
              >
                <Input
                  v-model:value="form[field.returns]"
                  :maxlength="field.max"
                />
              </Form.Item>
            </div>
            <div class="mt-4">
              <Button type="primary" html-type="submit" :loading="saving">
                保存发货设置
              </Button>
            </div>
          </Form>
        </Tabs.TabPane>
        <Tabs.TabPane key="devices" tab="打印设备">
          <SfDevices
            v-if="tab === 'devices'"
            :supported-paper-specs="config.supportedPaperSpecs"
          />
        </Tabs.TabPane>
      </Tabs>
    </Card>
  </Page>
</template>
