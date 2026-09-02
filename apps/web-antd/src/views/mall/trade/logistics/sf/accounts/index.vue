<script lang="ts" setup>
import type { SfPaperSpecValue } from '../paper-spec';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import { getSimpleDeliveryExpressList } from '#/api/mall/trade/delivery/express';
import { getSfAccounts, saveSfAccount } from '#/api/mall/trade/logistics/sf';

import {
  DEFAULT_SF_PAPER_SPEC,
  getSfPaperSpec,
  SF_PAPER_SPEC_OPTIONS,
  toSfPaperSpecValue,
} from '../paper-spec';

const accounts = ref<MallSfLogisticsApi.Account[]>([]);
const expressOptions = ref<Array<{ label: string; value: number }>>([]);
const saving = ref(false);
const form = reactive<MallSfLogisticsApi.Account>({
  name: '顺丰月结账号',
  logisticsId: 0,
  endpoint: 'https://sfapi.sf-express.com/std/service',
  serviceCode: '1',
  templateCode: '',
  senderName: '',
  senderPhone: '',
  senderProvince: '',
  senderCity: '',
  senderAddress: '',
  defaultWeightKg: 1,
  paperWidthMm: DEFAULT_SF_PAPER_SPEC.widthMm,
  paperHeightMm: DEFAULT_SF_PAPER_SPEC.heightMm,
  dpi: 203,
  defaultFlag: true,
  status: 0,
});
const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: 'Partner ID', dataIndex: 'partnerIdMasked' },
  { title: '月结卡', dataIndex: 'monthlyCardMasked' },
  { title: '产品类型', dataIndex: 'serviceCode' },
  { title: '模板', dataIndex: 'templateCode' },
  { title: '纸张', key: 'paperSpec' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions' },
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

async function load() {
  const [data, expresses] = await Promise.all([
    getSfAccounts(),
    getSimpleDeliveryExpressList(),
  ]);
  accounts.value = data;
  expressOptions.value = expresses
    .filter((item) => item.code?.toUpperCase() === 'SF')
    .map((item) => ({ label: item.name, value: item.id }));
  if (!form.logisticsId && expressOptions.value[0])
    form.logisticsId = expressOptions.value[0].value;
}
function editRecord(record: Record<string, any>) {
  const account = record as MallSfLogisticsApi.Account;
  Object.assign(form, account, {
    partnerId: '',
    checkWord: '',
    monthlyCard: '',
  });
}
function reset() {
  Object.assign(form, {
    id: undefined,
    name: '顺丰月结账号',
    partnerId: '',
    checkWord: '',
    monthlyCard: '',
    serviceCode: '1',
    templateCode: '',
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
    defaultFlag: accounts.value.length === 0,
    status: 0,
  });
}
async function save() {
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
    <Form layout="vertical" :model="form" class="mb-5">
      <div class="grid gap-4 md:grid-cols-4">
        <Form.Item label="配置名称" required>
          <Input v-model:value="form.name" />
        </Form.Item>
        <Form.Item label="顺丰快递公司" required>
          <Select v-model:value="form.logisticsId" :options="expressOptions" />
        </Form.Item>
        <Form.Item label="Partner ID" :required="!form.id">
          <Input
            v-model:value="form.partnerId"
            :placeholder="form.id ? '留空表示不修改' : ''"
          />
        </Form.Item>
        <Form.Item label="校验码" :required="!form.id">
          <Input.Password
            v-model:value="form.checkWord"
            :placeholder="form.id ? '留空表示不修改' : ''"
          />
        </Form.Item>
        <Form.Item label="月结卡号" :required="!form.id">
          <Input.Password
            v-model:value="form.monthlyCard"
            :placeholder="form.id ? '留空表示不修改' : ''"
          />
        </Form.Item>
        <Form.Item label="产品类型">
          <Input v-model:value="form.serviceCode" />
        </Form.Item>
        <Form.Item label="面单纸张" required>
          <Select
            v-model:value="paperSpecValue"
            :options="SF_PAPER_SPEC_OPTIONS"
          />
        </Form.Item>
        <Form.Item label="顺丰云打印模板代码" required>
          <Input v-model:value="form.templateCode" />
        </Form.Item>
        <Form.Item label="API 地址">
          <Input v-model:value="form.endpoint" />
        </Form.Item>
        <Form.Item label="发件人">
          <Input v-model:value="form.senderName" />
        </Form.Item>
        <Form.Item label="手机号">
          <Input v-model:value="form.senderPhone" />
        </Form.Item>
        <Form.Item label="省">
          <Input v-model:value="form.senderProvince" />
        </Form.Item>
        <Form.Item label="市">
          <Input v-model:value="form.senderCity" />
        </Form.Item>
        <Form.Item label="区县">
          <Input v-model:value="form.senderDistrict" />
        </Form.Item>
        <Form.Item label="详细地址" class="md:col-span-2">
          <Input v-model:value="form.senderAddress" />
        </Form.Item>
        <Form.Item label="默认重量 kg">
          <InputNumber
            v-model:value="form.defaultWeightKg"
            :min="0.001"
            class="w-full"
          />
        </Form.Item>
      </div>
      <Space>
        <Switch
          v-model:checked="form.defaultFlag"
          checked-children="默认"
          un-checked-children="非默认"
        />
        <Switch
          :checked="form.status === 0"
          checked-children="启用"
          un-checked-children="停用"
          @update:checked="
            (checked) => (form.status = checked === true ? 0 : 1)
          "
        />
        <Button type="primary" :loading="saving" @click="save">保存</Button><Button @click="reset">新建</Button>
      </Space>
    </Form>
    <Table
      row-key="id"
      :data-source="accounts"
      :columns="columns"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 0 ? 'green' : 'default'">
            {{ record.status === 0 ? '启用' : '停用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'paperSpec'">
          {{ record.paperWidthMm }}×{{ record.paperHeightMm }} mm
        </template>
        <template v-else-if="column.key === 'actions'">
          <Button type="link" @click="editRecord(record)"> 编辑 </Button>
        </template>
      </template>
    </Table>
  </Page>
</template>
