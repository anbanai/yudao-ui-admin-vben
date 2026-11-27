<script lang="ts" setup>
import type { PrintBridgeClient as PrintBridgeClientType } from 'print-bridge-sdk';

import type { SfPaperSpecValue } from '../../trade/logistics/sf/paper-spec';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  AutoComplete,
  Button,
  Checkbox,
  Descriptions,
  Divider,
  message,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  enrollMerchantPrintDevice,
  getMerchantPrintDevices,
  saveMerchantPrintDevice,
  testMerchantPrintDevice,
} from '#/api/merchant/workbench';

import {
  getDeviceSetupState,
  isEnrollmentExpired,
} from '../../trade/logistics/sf/devices/setup-state';
import {
  getSfPaperSpec,
  SF_PAPER_SPEC_OPTIONS,
} from '../../trade/logistics/sf/paper-spec';

type LocalPrinter = { isDefault?: boolean; name: string };

const props = defineProps<{ supportedPaperSpecs: string[] }>();
const devices = ref<MallSfLogisticsApi.Device[]>([]);
const enrolling = ref(false);
const loading = ref(false);
const detecting = ref(false);
const localPrinters = ref<LocalPrinter[]>([]);
const selectedPrinter = ref<string>();
const selectedDeviceId = ref<number>();
const onSelectedWorkstation = ref(false);
const diagnosticPaperSpec = ref<SfPaperSpecValue | undefined>(
  SF_PAPER_SPEC_OPTIONS.find((spec) =>
    props.supportedPaperSpecs.includes(spec.value),
  )?.value,
);
const diagnosticStatus = ref('');
const bindingPrinter = ref(false);
const testing = ref(false);
let client: PrintBridgeClientType | undefined;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let workstationVersion = 0;

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
const canDetectLocal = computed(
  () =>
    selectedDevice.value &&
    (boundDevices.value.length === 1 || onSelectedWorkstation.value),
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
    return;
  }
  selectedDeviceId.value =
    boundDevices.value.find((device) => device.defaultFlag)?.id ??
    boundDevices.value[0]?.id;
}

watch(
  selectedDeviceId,
  () => {
    workstationVersion++;
    onSelectedWorkstation.value = false;
    selectedPrinter.value = selectedDevice.value?.printerName;
    localPrinters.value = [];
    diagnosticStatus.value = '';
  },
  { flush: 'sync' },
);

async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    devices.value = await getMerchantPrintDevices();
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
    const result = await enrollMerchantPrintDevice();
    if (!result.configFile) throw new Error('服务端未生成配置文件');
    downloadConfig(result.configFile);
    message.success('配置已下载；请在 PrintBridge 中导入，密码留空');
    await load();
  } finally {
    enrolling.value = false;
  }
}

async function bindPrinter(printerName: unknown) {
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
    await saveMerchantPrintDevice({
      id: selectedDevice.value.id,
      defaultFlag: selectedDevice.value.defaultFlag,
      status: selectedDevice.value.status,
      printerName,
    });
    message.success('打印机已绑定');
    await load();
  } finally {
    bindingPrinter.value = false;
  }
}

async function setDefaultDevice() {
  const device = selectedDevice.value;
  if (!device?.id || !device.printerName || bindingPrinter.value) return;
  bindingPrinter.value = true;
  try {
    await saveMerchantPrintDevice({
      id: device.id,
      defaultFlag: true,
      printerName: device.printerName,
      status: device.status,
    });
    await load();
    message.success('已设为本店默认打印设备');
  } finally {
    bindingPrinter.value = false;
  }
}

async function detectLocal() {
  if (detecting.value || !canDetectLocal.value) return;
  const version = workstationVersion;
  const printerBeforeDetection = selectedPrinter.value;
  detecting.value = true;
  diagnosticStatus.value = '';
  try {
    const { PrintBridgeClient } = await import('print-bridge-sdk');
    if (version !== workstationVersion || !canDetectLocal.value) return;
    client = new PrintBridgeClient({
      ip: '127.0.0.1',
      port: 17_890,
      connectTimeoutMs: 3000,
      requestTimeoutMs: 5000,
    });
    await client.connect();
    await client.ping();
    const printers = await client.getPrintersList();
    if (version !== workstationVersion || !canDetectLocal.value) return;
    localPrinters.value = printers;
    if (printers.length === 0) {
      message.error('本机未检测到打印机');
      return;
    }
    if (selectedPrinter.value !== printerBeforeDetection) return;
    const savedPrinter = selectedDevice.value?.printerName;
    selectedPrinter.value =
      printers.find((item) => item.name === savedPrinter)?.name ??
      printers.find((item) => item.isDefault)?.name ??
      printers[0]?.name;
  } catch {
    if (version === workstationVersion && canDetectLocal.value) {
      localPrinters.value = [];
      message.error('未连接到 PrintBridge，请确认软件已启动');
    }
  } finally {
    client?.disconnect();
    client = undefined;
    detecting.value = false;
  }
}

async function testPrint() {
  const device = selectedDevice.value;
  const paper = diagnosticPaperSpec.value;
  if (
    !device?.id ||
    !device.printerName ||
    !paper ||
    !props.supportedPaperSpecs.includes(paper)
  )
    return;
  testing.value = true;
  diagnosticStatus.value = '';
  try {
    const paperSpec = getSfPaperSpec(paper);
    const task = await testMerchantPrintDevice(device.id, {
      paperHeightMm: paperSpec.heightMm,
      paperWidthMm: paperSpec.widthMm,
    });
    diagnosticStatus.value = `测试任务 ${task.jobId} 已提交至 ${device.deviceName}`;
    message.success('已提交至所选设备');
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

onMounted(() => {
  void load();
  refreshTimer = setInterval(
    () => void load(true).catch(() => undefined),
    10_000,
  );
});
onBeforeUnmount(() => {
  workstationVersion++;
  client?.disconnect();
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div>
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
        v-if="!pendingDevice || pendingExpired"
        type="primary"
        :loading="enrolling"
        @click="enroll"
      >
        <template #icon>
          <IconifyIcon icon="lucide:download" />
        </template>
        {{
          pendingExpired
            ? '重新下载配置'
            : boundDevices.length
              ? '绑定新设备'
              : '下载 PrintBridge 配置'
        }}
      </Button>
      <Button
        v-if="boundDevices.length > 0"
        type="primary"
        :loading="detecting"
        :disabled="!canDetectLocal"
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
          />
        </div>

        <Checkbox
          v-if="boundDevices.length > 1"
          v-model:checked="onSelectedWorkstation"
          class="mb-4"
        >
          当前浏览器正在 {{ selectedDevice.deviceName }} 上运行
        </Checkbox>

        <Descriptions bordered size="small" :column="{ xs: 1, sm: 2 }">
          <Descriptions.Item label="本店默认设备">
            <Tag v-if="selectedDevice.defaultFlag" color="green">默认</Tag>
            <Button
              v-else
              type="link"
              :disabled="!selectedDevice.printerName"
              :loading="bindingPrinter"
              @click="setDefaultDevice"
            >
              设为默认
            </Button>
          </Descriptions.Item>
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
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <AutoComplete
            v-model:value="selectedPrinter"
            class="w-72"
            placeholder="输入所选工作站的打印机名称，或在本机检测"
            :maxlength="128"
            :options="localPrinters.map((printer) => ({ value: printer.name }))"
          />
          <Button
            :disabled="
              !selectedPrinter?.trim() ||
              selectedPrinter === selectedDevice.printerName
            "
            :loading="bindingPrinter"
            @click="bindPrinter(selectedPrinter?.trim())"
          >
            绑定打印机
          </Button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <Select
            v-model:value="diagnosticPaperSpec"
            class="w-72"
            :options="
              SF_PAPER_SPEC_OPTIONS.filter((spec) =>
                supportedPaperSpecs.includes(spec.value),
              )
            "
          />
          <Button
            :disabled="
              !selectedDevice.printerName ||
              !diagnosticPaperSpec ||
              !supportedPaperSpecs.includes(diagnosticPaperSpec)
            "
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
  </div>
</template>
