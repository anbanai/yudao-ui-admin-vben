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
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  bindWechatPrinter,
  getWechatLogisticsAccountStatus,
  getWechatLogisticsConfig,
  getWechatPrinter,
  saveWechatLogisticsConfig,
} from '#/api/mall/trade/logistics/wechat';
import { WechatUserSelect } from '#/views/member/components';

const loading = ref(false);
const accountLoading = ref(false);
const accountStatus = ref<MallWechatLogisticsApi.AccountStatus>();
const printer = ref<MallWechatLogisticsApi.Printer>();
const printerOpenid = ref('');
const bindLoading = ref(false);
const manualOpenid = ref(false);
const mpUserSelectRef = ref<InstanceType<typeof WechatUserSelect>>();

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
  await Promise.all([refreshAccountStatus(), refreshPrinter()]);
  const config = await getWechatLogisticsConfig();
  if (config) {
    Object.assign(form, config);
  }
}

/** 当前绑定展示：openid -> 昵称 */
const boundPrinterText = computed(() => {
  const ids = printer.value?.openid ?? [];
  if (!ids.length) return '未绑定';
  const userMap = mpUserSelectRef.value?.userMap;
  return ids
    .map((id) => {
      const user = userMap?.get(id);
      return user?.nickname ? `${user.nickname}（${id}）` : id;
    })
    .join('、');
});

async function refreshPrinter() {
  printer.value = await getWechatPrinter();
  printerOpenid.value = printer.value?.openid?.[0] ?? '';
}

async function handleSave() {
  if (
    !form.bizId ||
    form.serviceType === null ||
    form.serviceType === undefined ||
    !form.serviceName
  ) {
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
  const openid = printerOpenid.value?.toString().trim();
  if (!openid) {
    message.warning('请先选择打印员');
    return;
  }
  bindLoading.value = true;
  try {
    await bindWechatPrinter({
      openid,
      updateType: 'bind',
    });
    await refreshPrinter();
    message.success('打印员绑定成功');
  } finally {
    bindLoading.value = false;
  }
}

async function handleUnbindPrinter() {
  const openid = printerOpenid.value?.toString().trim();
  if (!openid) {
    message.warning('请先选择要解绑的打印员');
    return;
  }
  bindLoading.value = true;
  try {
    await bindWechatPrinter({
      openid,
      updateType: 'unbind',
    });
    await refreshPrinter();
    message.success('打印员已解绑');
  } finally {
    bindLoading.value = false;
  }
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
        <template #extra>
          <Button type="primary" :loading="loading" @click="handleSave">
            保存配置
          </Button>
        </template>
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
            <span>启用微信物流打单</span
            ><Switch v-model:checked="form.enabled" />
          </Space>
        </Form>
      </Card>

      <Card title="微信打单打印员">
        <Alert
          class="mb-4"
          type="info"
          show-icon
          message="打印员是使用自己微信登录「微信打单」PC 软件的员工"
        >
          <template #description>
            绑定后，订单创建微信运单时，打印员电脑上的打单软件会自动收到任务并打出顺丰电子面单；
            未绑定时没有人能接收打印任务，面单无法打印，也就无法走「微信打单发货」流程。
            打印员须为已授权本小程序的微信用户（拥有
            openid），未绑定微信的用户将置灰不可选。
          </template>
        </Alert>
        <div class="flex flex-wrap items-center gap-3">
          <WechatUserSelect
            v-if="!manualOpenid"
            ref="mpUserSelectRef"
            v-model="printerOpenid"
          />
          <Input
            v-else
            v-model:value="printerOpenid"
            placeholder="打印员 OpenID"
            class="w-80"
          />
          <Button
            type="link"
            @click="
              manualOpenid = !manualOpenid;
              printerOpenid = '';
            "
          >
            {{ manualOpenid ? '返回选择员工' : '手动输入 OpenID' }}
          </Button>
          <Button
            type="primary"
            :loading="bindLoading"
            @click="handleBindPrinter"
          >
            绑定打印员
          </Button>
          <Button
            danger
            :disabled="!printer?.openid?.length || bindLoading"
            @click="handleUnbindPrinter"
          >
            解绑
          </Button>
        </div>
        <div class="mt-3 text-sm text-gray-500">
          若下拉中没有该员工，请确认其已在本小程序授权微信登录（拥有
          openid），或改用手动输入 OpenID。
        </div>
        <div class="mt-1 text-sm text-gray-500">
          当前绑定：{{ boundPrinterText }}
        </div>
      </Card>
    </div>
  </Page>
</template>
