<script lang="ts" setup>
import type { PrintBridgeClient as PrintBridgeClientType } from 'print-bridge-sdk';

import type { SfPaperSpecValue } from '../paper-spec';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Descriptions,
  Divider,
  message,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  createDiagnosticPayload,
  enrollPrintDevice,
  getPrintDevices,
  savePrintDevice,
} from '#/api/mall/trade/logistics/sf';

import {
  DEFAULT_SF_PAPER_SPEC,
  getSfPaperSpec,
  SF_PAPER_SPEC_OPTIONS,
} from '../paper-spec';
import { getDeviceSetupState, isEnrollmentExpired } from './setup-state';

type LocalPrinter = { isDefault?: boolean; name: string };

const devices = ref<MallSfLogisticsApi.Device[]>([]);
const enrolling = ref(false);
const loading = ref(false);
const localConnected = ref(false);
const detecting = ref(false);
const localPrinters = ref<LocalPrinter[]>([]);
const selectedPrinter = ref<string>();
const selectedDeviceId = ref<number>();
const diagnosticPaperSpec = ref<SfPaperSpecValue>(DEFAULT_SF_PAPER_SPEC.value);
const diagnosticStatus = ref('');
const bindingPrinter = ref(false);
const testing = ref(false);
let client: PrintBridgeClientType | undefined;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

const managedDevices = computed(() =>
  devices.value.filter(
    (device) =>
      device.status === 0 &&
      (device.pending || device.lastPollTime || device.printerName),
  ),
);
const setupState = computed(() => getDeviceSetupState(managedDevices.value));
const pendingDevice = computed(() =>
  managedDevices.value.find((device) => device.pending),
);
const pendingExpired = computed(() =>
  pendingDevice.value ? isEnrollmentExpired(pendingDevice.value) : false,
);
const boundDevices = computed(() =>
  managedDevices.value.filter(
    (device) => !device.pending && device.lastPollTime && device.id,
  ),
);
const selectedDevice = computed(() =>
  boundDevices.value.find((device) => device.id === selectedDeviceId.value),
);

function isOnline(device?: MallSfLogisticsApi.Device) {
  if (!device?.lastPollTime) return false;
  return Date.now() - new Date(device.lastPollTime).getTime() < 60_000;
}

function selectCurrentDevice() {
  if (
    selectedDeviceId.value &&
    boundDevices.value.some((device) => device.id === selectedDeviceId.value)
  ) {
    selectedPrinter.value = selectedDevice.value?.printerName;
    return;
  }
  selectedDeviceId.value =
    boundDevices.value.find((device) => device.defaultFlag)?.id ??
    boundDevices.value[0]?.id;
  selectedPrinter.value = selectedDevice.value?.printerName;
}

async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    devices.value = await getPrintDevices();
    selectCurrentDevice();
  } finally {
    if (!silent) loading.value = false;
  }
}

function downloadConfig(configFile: string) {
  const url = URL.createObjectURL(
    new Blob([configFile], { type: 'application/json;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'printbridge-config.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function enroll() {
  if (enrolling.value) return;
  enrolling.value = true;
  try {
    const result = await enrollPrintDevice();
    if (!result.configFile) throw new Error('服务端未生成配置文件');
    downloadConfig(result.configFile);
    message.success('配置已下载；请在 PrintBridge 中导入，密码留空');
    await load();
  } finally {
    enrolling.value = false;
  }
}

async function bindPrinter(printerName: unknown, detected = false) {
  if (
    bindingPrinter.value ||
    !selectedDevice.value?.id ||
    typeof printerName !== 'string' ||
    !printerName
  ) {
    return;
  }
  bindingPrinter.value = true;
  try {
    await savePrintDevice({
      ...selectedDevice.value,
      printerName,
    });
    message.success(detected ? '已自动绑定默认打印机' : '打印机已切换');
    await load();
  } finally {
    bindingPrinter.value = false;
  }
}

async function detectLocal() {
  if (detecting.value) return;
  detecting.value = true;
  diagnosticStatus.value = '';
  client?.disconnect();
  const { PrintBridgeClient } = await import('print-bridge-sdk');
  client = new PrintBridgeClient({
    ip: '127.0.0.1',
    port: 17_890,
    connectTimeoutMs: 3000,
    requestTimeoutMs: 5000,
  });
  client.on('status', (event) => {
    diagnosticStatus.value = event.message
      ? `${event.status}：${event.message}`
      : event.status;
  });
  try {
    await client.connect();
    await client.ping();
    localConnected.value = true;
    localPrinters.value = await client.getPrintersList();
    if (localPrinters.value.length === 0) {
      selectedPrinter.value = undefined;
      message.error('未检测到打印机，请先安装得力官方驱动');
      return;
    }
    const savedPrinter = selectedDevice.value?.printerName;
    selectedPrinter.value =
      localPrinters.value.find((item) => item.name === savedPrinter)?.name ??
      localPrinters.value.find((item) => item.isDefault)?.name ??
      localPrinters.value[0]?.name;
    if (selectedPrinter.value && selectedPrinter.value !== savedPrinter) {
      await bindPrinter(selectedPrinter.value, true);
    }
  } catch {
    localConnected.value = false;
    localPrinters.value = [];
    selectedPrinter.value = undefined;
    message.error('未连接到 PrintBridge，请确认软件已启动');
  } finally {
    detecting.value = false;
  }
}

async function testPrint() {
  if (!client?.isConnected() || !selectedPrinter.value) {
    message.warning('请先检测本机打印机');
    return;
  }
  testing.value = true;
  diagnosticStatus.value = '';
  try {
    const paperSpec = getSfPaperSpec(diagnosticPaperSpec.value);
    const fileUrl = await createDiagnosticPayload({
      paperHeightMm: paperSpec.heightMm,
      paperWidthMm: paperSpec.widthMm,
    });
    const accepted = await client.print({
      type: 'image',
      fileUrl,
      printerName: selectedPrinter.value,
      copies: 1,
      paper: {
        heightMm: paperSpec.heightMm,
        widthMm: paperSpec.widthMm,
      },
    });
    diagnosticStatus.value = accepted.status;
    message.success('测试标签已提交');
  } catch (error) {
    const detail = error instanceof Error ? error.message : '打印失败';
    diagnosticStatus.value = detail;
    message.error(
      detail.includes('printer not configured')
        ? '打印机尚未绑定，请重新检测'
        : detail,
    );
  } finally {
    testing.value = false;
  }
}

onMounted(async () => {
  await load();
  refreshTimer = setInterval(
    () => void load(true).catch(() => undefined),
    10_000,
  );
});
onBeforeUnmount(() => {
  client?.disconnect();
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <Page auto-content-height title="打印设备">
    <Alert
      :type="setupState.type"
      show-icon
      :message="setupState.title"
      :description="setupState.description"
      class="mb-5"
    />

    <Alert
      v-if="pendingDevice"
      type="info"
      show-icon
      message="在 PrintBridge 点击“导入配置”，密码留空；导入成功后请删除下载文件。"
      class="mb-4"
    />

    <section class="flex flex-wrap items-center gap-3">
      <Button
        v-if="setupState.key === 'not-configured' || pendingExpired"
        type="primary"
        :loading="enrolling"
        @click="enroll"
      >
        <template #icon>
          <IconifyIcon icon="lucide:download" />
        </template>
        {{ pendingExpired ? '重新下载配置' : '下载 PrintBridge 配置' }}
      </Button>
      <Button
        v-if="boundDevices.length > 0"
        type="primary"
        :loading="detecting"
        @click="detectLocal"
      >
        <template #icon>
          <IconifyIcon icon="lucide:scan-line" />
        </template>
        检测本机打印机
      </Button>
      <Button :loading="loading" @click="load()">
        <template #icon>
          <IconifyIcon icon="lucide:refresh-cw" />
        </template>
        刷新状态
      </Button>
      <Tag v-if="pendingDevice" color="gold">等待首次连接</Tag>
    </section>

    <template v-if="selectedDevice">
      <Divider />

      <section class="max-w-5xl">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 class="m-0 text-base font-medium">当前工作站</h3>
          <Select
            v-if="boundDevices.length > 1"
            v-model:value="selectedDeviceId"
            class="w-64"
            :options="
              boundDevices.map((device) => ({
                label: device.deviceName,
                value: device.id,
              }))
            "
            @change="selectedPrinter = selectedDevice?.printerName"
          />
        </div>

        <Descriptions bordered size="small" :column="{ xs: 1, sm: 2 }">
          <Descriptions.Item label="设备">
            {{ selectedDevice.deviceName }}
          </Descriptions.Item>
          <Descriptions.Item label="连接状态">
            <Tag :color="isOnline(selectedDevice) ? 'green' : 'default'">
              {{ isOnline(selectedDevice) ? '在线' : '离线' }}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Windows 打印机">
            {{ selectedDevice.printerName || '待检测' }}
          </Descriptions.Item>
          <Descriptions.Item label="最近连接">
            {{ selectedDevice.lastPollTime || '-' }}
          </Descriptions.Item>
        </Descriptions>
      </section>

      <Divider />

      <section class="max-w-5xl">
        <h3 class="mb-4 text-base font-medium">打印校准</h3>
        <div class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
          <Select
            v-model:value="selectedPrinter"
            placeholder="检测后自动选择系统默认打印机"
            :disabled="bindingPrinter || !localConnected"
            :options="
              localPrinters.map((printer) => ({
                label: `${printer.name}${printer.isDefault ? '（系统默认）' : ''}`,
                value: printer.name,
              }))
            "
            @change="(value) => bindPrinter(value)"
          />
          <Select
            v-model:value="diagnosticPaperSpec"
            :options="SF_PAPER_SPEC_OPTIONS"
          />
          <Button
            :disabled="!selectedPrinter || !localConnected"
            :loading="testing"
            @click="testPrint"
          >
            <template #icon>
              <IconifyIcon icon="lucide:printer" />
            </template>
            测试打印
          </Button>
        </div>
        <Space v-if="diagnosticStatus" class="mt-3" wrap>
          <span class="text-sm text-gray-500">{{ diagnosticStatus }}</span>
        </Space>
      </section>
    </template>
  </Page>
</template>
