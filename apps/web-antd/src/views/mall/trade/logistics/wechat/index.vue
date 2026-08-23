<script lang="ts" setup>
import type { MallWechatLogisticsApi } from '#/api/mall/trade/logistics/wechat';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
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

import {
  bindWechatPrinter,
  cancelWechatWaybill,
  confirmWechatWaybillPrint,
  getWechatLogisticsAccountStatus,
  getWechatLogisticsConfig,
  getWechatLogisticsPending,
  getWechatPrinter,
  getWechatWaybillTrace,
  saveWechatLogisticsConfig,
  syncWechatWaybillTrace,
} from '#/api/mall/trade/logistics/wechat';

const loading = ref(false);
const accountLoading = ref(false);
const pendingLoading = ref(false);
const accountStatus = ref<MallWechatLogisticsApi.AccountStatus>();
const printer = ref<MallWechatLogisticsApi.Printer>();
const pendingWaybills = ref<MallWechatLogisticsApi.Waybill[]>([]);
const traceVisible = ref(false);
const traceLoading = ref(false);
const traces = ref<MallWechatLogisticsApi.Trace[]>([]);
const selectedWaybill = ref<MallWechatLogisticsApi.Waybill>();
const printerOpenid = ref('');

const form = reactive<MallWechatLogisticsApi.Config>({
  userType: 1,
  deliveryId: 'SF',
  bizId: '',
  serviceType: 0,
  serviceName: '',
  enabled: true,
  senderName: '',
  senderTel: '',
  senderMobile: '',
  senderCompany: '',
  senderPostCode: '',
  senderCountry: '中国',
  senderProvince: '',
  senderCity: '',
  senderArea: '',
  senderAddress: '',
  defaultWeight: 1,
  defaultSpaceLength: 15,
  defaultSpaceWidth: 10,
  defaultSpaceHeight: 5,
});

const sfAccounts = computed(() =>
  (accountStatus.value?.accounts ?? []).filter(
    (account) => account.deliveryId === 'SF',
  ),
);
const serviceOptions = computed(() => {
  const account = sfAccounts.value.find((item) => item.bizId === form.bizId);
  return (account?.serviceTypes ?? []).map((item) => ({
    label: item.serviceName ?? String(item.serviceType),
    value: item.serviceType,
    serviceName: item.serviceName,
  }));
});

function applyServiceName(value: unknown) {
  const serviceType = typeof value === 'number' ? value : Number(value);
  form.serviceType = serviceType;
  form.serviceName =
    serviceOptions.value.find((item) => item.value === serviceType)
      ?.serviceName ?? '';
}

async function refreshAccountStatus() {
  accountLoading.value = true;
  try {
    accountStatus.value = await getWechatLogisticsAccountStatus();
  } finally {
    accountLoading.value = false;
  }
}

async function load() {
  await Promise.all([
    refreshAccountStatus(),
    refreshPending(),
    refreshPrinter(),
  ]);
  const config = await getWechatLogisticsConfig();
  if (config) {
    Object.assign(form, config);
  }
}

async function refreshPending() {
  pendingLoading.value = true;
  try {
    pendingWaybills.value = await getWechatLogisticsPending();
  } finally {
    pendingLoading.value = false;
  }
}

async function refreshPrinter() {
  printer.value = await getWechatPrinter();
  printerOpenid.value = printer.value?.openid?.[0] ?? '';
}

async function handleSave() {
  if (!form.bizId || !form.serviceType || !form.serviceName) {
    message.warning('请先选择已生效的顺丰账号和服务类型');
    return;
  }
  loading.value = true;
  try {
    await saveWechatLogisticsConfig(form);
    message.success('物流配置已保存');
  } finally {
    loading.value = false;
  }
}

async function handleBindPrinter() {
  if (!printerOpenid.value.trim()) {
    message.warning('请输入打印员 OpenID');
    return;
  }
  await bindWechatPrinter({
    openid: printerOpenid.value.trim(),
    updateType: 'bind',
  });
  await refreshPrinter();
  message.success('打印员绑定成功');
}

async function handleConfirm(row: MallWechatLogisticsApi.Waybill) {
  await confirmWechatWaybillPrint(row.id!);
  message.success(`订单 ${row.orderNo ?? row.orderId} 已发货`);
  await refreshPending();
}

async function handleCancel(row: MallWechatLogisticsApi.Waybill) {
  await cancelWechatWaybill(row.id!);
  message.success('微信物流订单已取消');
  await refreshPending();
}

async function handleTrace(row: MallWechatLogisticsApi.Waybill) {
  selectedWaybill.value = row;
  traceVisible.value = true;
  traceLoading.value = true;
  try {
    await syncWechatWaybillTrace(row.id!);
    traces.value = await getWechatWaybillTrace(row.id!);
  } finally {
    traceLoading.value = false;
  }
}

function statusColor(status?: string) {
  return status === 'CREATED'
    ? 'green'
    : status === 'FAILED'
      ? 'red'
      : 'orange';
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <div class="space-y-4">
      <Alert
        v-if="accountStatus"
        :message="accountStatus.message"
        :type="accountStatus.available ? 'success' : 'warning'"
        show-icon
      />

      <Card title="顺丰微信物流账号">
        <template #extra>
          <Button :loading="accountLoading" @click="refreshAccountStatus">
刷新账号状态
</Button>
        </template>
        <div v-if="sfAccounts.length" class="grid gap-3 md:grid-cols-2">
          <div
            v-for="account in sfAccounts"
            :key="account.bizId"
            class="rounded border p-3"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium">{{
                account.alias || '顺丰月结账号'
              }}</span>
              <Tag :color="account.statusCode === 0 ? 'green' : 'red'">
                {{
                  account.statusCode === 0
                    ? '可用'
                    : `状态 ${account.statusCode}`
                }}
              </Tag>
            </div>
            <div class="mt-2 text-sm text-gray-500">
              biz_id：{{ account.bizId }}
            </div>
            <div class="text-sm text-gray-500">
              可用服务：{{
                account.serviceTypes
                  ?.map((item) => item.serviceName)
                  .join('、') || '未返回'
              }}
            </div>
          </div>
        </div>
        <div v-else class="text-gray-500">
          微信后台尚未返回可用的顺丰账号，请先绑定月结账号并确认电子面单权限。
        </div>
      </Card>

      <Card title="物流参数配置">
        <Form layout="vertical" :model="form">
          <div class="grid gap-4 md:grid-cols-3">
            <Form.Item label="快递公司">
<Input v-model:value="form.deliveryId" disabled />
</Form.Item>
            <Form.Item label="biz_id" required>
<Select
                v-model:value="form.bizId"
                :options="
                  sfAccounts.map((item) => ({
                    label: `${item.bizId}${item.alias ? `（${item.alias}）` : ''}`,
                    value: item.bizId,
                  }))
                "
                @change="
                  () => {
                    form.serviceType = 0;
                    form.serviceName = '';
                  }
                "
            />
</Form.Item>
            <Form.Item label="服务类型" required>
<Select
                v-model:value="form.serviceType"
                :options="serviceOptions"
                @change="applyServiceName"
            />
</Form.Item>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <Form.Item label="发件人姓名" required>
<Input v-model:value="form.senderName" />
</Form.Item>
            <Form.Item label="发件人手机号" required>
<Input v-model:value="form.senderMobile" />
</Form.Item>
            <Form.Item label="发件人电话">
<Input v-model:value="form.senderTel" />
</Form.Item>
            <Form.Item label="发件人公司">
<Input v-model:value="form.senderCompany" />
</Form.Item>
            <Form.Item label="省">
<Input v-model:value="form.senderProvince" />
</Form.Item>
            <Form.Item label="市">
<Input v-model:value="form.senderCity" />
</Form.Item>
            <Form.Item label="区县">
<Input v-model:value="form.senderArea" />
</Form.Item>
            <Form.Item label="详细地址" class="md:col-span-2">
<Input v-model:value="form.senderAddress" />
</Form.Item>
          </div>
          <div class="grid gap-4 md:grid-cols-4">
            <Form.Item label="默认重量（kg）">
<InputNumber
                v-model:value="form.defaultWeight"
                :min="0.01"
                class="w-full"
            />
</Form.Item>
            <Form.Item label="默认长度（cm）">
<InputNumber
                v-model:value="form.defaultSpaceLength"
                :min="0.01"
                class="w-full"
            />
</Form.Item>
            <Form.Item label="默认宽度（cm）">
<InputNumber
                v-model:value="form.defaultSpaceWidth"
                :min="0.01"
                class="w-full"
            />
</Form.Item>
            <Form.Item label="默认高度（cm）">
<InputNumber
                v-model:value="form.defaultSpaceHeight"
                :min="0.01"
                class="w-full"
            />
</Form.Item>
          </div>
          <Space>
            <span>启用微信物流打单</span><Switch v-model:checked="form.enabled" />
            <Button type="primary" :loading="loading" @click="handleSave">
保存配置
</Button>
          </Space>
        </Form>
      </Card>

      <Card title="微信打单打印员">
        <div class="flex flex-wrap items-center gap-3">
          <Input
            v-model:value="printerOpenid"
            placeholder="打印员 OpenID"
            class="w-80"
          />
          <Button type="primary" @click="handleBindPrinter">绑定打印员</Button>
          <span class="text-sm text-gray-500">当前绑定：{{ printer?.openid?.join('、') || '未绑定' }}</span>
        </div>
      </Card>

      <Card title="待确认打印运单">
        <template #extra>
<Button @click="refreshPending">刷新</Button>
</template>
        <Table
          :loading="pendingLoading"
          :data-source="pendingWaybills"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 900 }"
        >
          <Table.Column title="订单号" data-index="orderNo" />
          <Table.Column title="微信运单号" data-index="waybillId" />
          <Table.Column title="状态" data-index="status">
<template #default="{ record }">
<Tag :color="statusColor(record.status)">
{{
                record.status
              }}
</Tag>
</template>
</Table.Column>
          <Table.Column title="错误信息" data-index="errorMessage" />
          <Table.Column title="操作" key="actions" fixed="right" width="250">
<template #default="{ record }">
<Space>
<Button
                  type="link"
                  :disabled="record.status !== 'CREATED'"
                  @click="handleConfirm(record)"
                  >
确认打印并发货
</Button><Button
                  type="link"
                  danger
                  :disabled="record.status !== 'CREATED'"
                  @click="handleCancel(record)"
                  >
取消
</Button><Button type="link" @click="handleTrace(record)">
轨迹
</Button>
</Space>
</template>
</Table.Column>
        </Table>
      </Card>
    </div>

    <a-modal
      v-model:open="traceVisible"
      :title="`物流轨迹 ${selectedWaybill?.waybillId ?? ''}`"
      :footer="null"
    >
      <a-spin :spinning="traceLoading">
<a-empty
          v-if="!traceLoading && !traces.length"
          description="暂无轨迹"
        /><a-timeline v-else>
<a-timeline-item
            v-for="trace in traces"
            :key="trace.id"
            :label="trace.actionTime"
            >
{{ trace.actionMsg }}
</a-timeline-item>
</a-timeline>
</a-spin>
    </a-modal>
  </Page>
</template>
