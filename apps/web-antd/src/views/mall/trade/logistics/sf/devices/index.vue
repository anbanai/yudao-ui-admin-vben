<script lang="ts" setup>
import type { PrintBridgeClient as PrintBridgeClientType } from 'print-bridge-sdk';

import type { SfPaperSpecValue } from '../paper-spec';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createDiagnosticPayload,
  getPrintDevices,
  rotatePrintDeviceToken,
  savePrintDevice,
} from '#/api/mall/trade/logistics/sf';

import {
  DEFAULT_SF_PAPER_SPEC,
  getSfPaperSpec,
  SF_PAPER_SPEC_OPTIONS,
} from '../paper-spec';

type LocalPrinter = { isDefault?: boolean; name: string };
type QueueJob = { jobId: string; message?: string; status: string };
type PrinterInfo = {
  dpi?: null | number;
  papers: Array<{ heightMm: number; name?: string; widthMm: number }>;
};

const devices = ref<MallSfLogisticsApi.Device[]>([]);
const form = reactive<MallSfLogisticsApi.Device>({
  deviceCode: '',
  deviceName: '',
  defaultFlag: true,
  status: 0,
});
const latestToken = ref('');
const localConnected = ref(false);
const agentStatus = ref('未检测');
const localPrinters = ref<LocalPrinter[]>([]);
const selectedPrinter = ref<string>();
const queue = ref<QueueJob[]>([]);
const diagnosticStatus = ref('');
const diagnosticPaperSpec = ref<SfPaperSpecValue>(DEFAULT_SF_PAPER_SPEC.value);
const printerInfo = ref<PrinterInfo>();
const saving = ref(false);
const rotatingId = ref<number>();
let client: PrintBridgeClientType | undefined;

const columns = [
  { title: '设备编号', dataIndex: 'deviceCode' },
  { title: '设备名称', dataIndex: 'deviceName' },
  { title: '最近轮询', dataIndex: 'lastPollTime' },
  { title: '版本', dataIndex: 'version' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions' },
];

async function load() {
  devices.value = await getPrintDevices();
}
async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    const result = await savePrintDevice(form);
    latestToken.value = result.token || '';
    message.success('设备已保存');
    Object.assign(form, {
      id: undefined,
      deviceCode: '',
      deviceName: '',
      defaultFlag: false,
      status: 0,
    });
    await load();
  } finally {
    saving.value = false;
  }
}
function editRecord(record: Record<string, any>) {
  Object.assign(form, record as MallSfLogisticsApi.Device);
}
async function rotate(id: number) {
  if (rotatingId.value) return;
  rotatingId.value = id;
  try {
    const result = await rotatePrintDeviceToken(id);
    latestToken.value = result.token || '';
    message.success('Token 已轮换，旧 Token 立即失效');
  } finally {
    rotatingId.value = undefined;
  }
}
async function loadPrinterInfo(printerName?: string) {
  printerInfo.value =
    client?.isConnected() && printerName
      ? await client.getPrinterInfo(printerName)
      : undefined;
}
function handlePrinterChange(value: unknown) {
  if (typeof value === 'string') {
    void loadPrinterInfo(value);
  }
}
async function detectLocal() {
  client?.disconnect();
  const { PrintBridgeClient } = await import('print-bridge-sdk');
  client = new PrintBridgeClient({
    ip: '127.0.0.1',
    port: 17_890,
    connectTimeoutMs: 3000,
    requestTimeoutMs: 5000,
  });
  client.on('status', (event) => {
    diagnosticStatus.value = `${event.status}${event.message ? `：${event.message}` : ''}`;
  });
  try {
    await client.connect();
    const pong = await client.ping();
    localPrinters.value = await client.getPrintersList();
    queue.value = await client.getPrintQueue();
    selectedPrinter.value =
      localPrinters.value.find((item) => item.isDefault)?.name ??
      localPrinters.value[0]?.name;
    await loadPrinterInfo(selectedPrinter.value);
    agentStatus.value = pong.agentStatus;
    localConnected.value = true;
  } catch (error) {
    localConnected.value = false;
    agentStatus.value = error instanceof Error ? error.message : '连接失败';
    message.error(
      '无法连接本机 PrintBridge，请检查 Agent、Origin 白名单和 17890 端口',
    );
  }
}
async function testPrint() {
  if (!client?.isConnected())
    return message.warning('请先检测本机 PrintBridge');
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
  diagnosticStatus.value = `${accepted.status}：${accepted.jobId}`;
}
onMounted(load);
onBeforeUnmount(() => client?.disconnect());
</script>

<template>
  <Page auto-content-height title="打印设备">
    <Alert
      v-if="latestToken"
      class="mb-4"
      type="warning"
      show-icon
      message="设备 Token 仅显示本次，请立即配置到 PrintBridge 后妥善保存。"
      :description="latestToken"
    />
    <Form layout="inline" :model="form" class="mb-4">
      <Form.Item label="设备编号" required>
        <Input v-model:value="form.deviceCode" placeholder="packing-01" />
      </Form.Item>
      <Form.Item label="设备名称" required>
        <Input v-model:value="form.deviceName" placeholder="打包台一号" />
      </Form.Item>
      <Form.Item>
        <Switch
          v-model:checked="form.defaultFlag"
          checked-children="默认"
          un-checked-children="非默认"
        />
      </Form.Item>
      <Form.Item>
        <Switch
          :checked="form.status === 0"
          checked-children="启用"
          un-checked-children="停用"
          @update:checked="
            (checked) => (form.status = checked === true ? 0 : 1)
          "
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" :loading="saving" @click="save">
          保存设备
        </Button>
      </Form.Item>
    </Form>
    <Table
      row-key="id"
      :data-source="devices"
      :columns="columns"
      :pagination="false"
      class="mb-5"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 0 ? 'green' : 'default'">
            {{ record.status === 0 ? '启用' : '停用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <Space>
            <Button type="link" @click="editRecord(record)">编辑</Button>
            <Button
              type="link"
              danger
              :loading="rotatingId === record.id"
              @click="rotate(record.id)"
            >
              轮换 Token
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <div class="border-t pt-5">
      <div class="mb-3 flex items-center gap-3">
        <h3 class="m-0 text-base font-medium">本机诊断</h3>
        <Button @click="detectLocal">检测本机</Button>
      </div>
      <Descriptions bordered size="small" :column="2">
        <Descriptions.Item label="连接状态">
          <Tag :color="localConnected ? 'green' : 'default'">
            {{ localConnected ? '已连接' : '未连接' }}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Agent 状态">
          {{ agentStatus }}
        </Descriptions.Item>
        <Descriptions.Item label="打印机">
          <Select
            v-model:value="selectedPrinter"
            class="w-72"
            :options="
              localPrinters.map((item) => ({
                label: `${item.name}${item.isDefault ? '（默认）' : ''}`,
                value: item.name,
              }))
            "
            @change="handlePrinterChange"
          />
        </Descriptions.Item>
        <Descriptions.Item label="测试纸张">
          <Select
            v-model:value="diagnosticPaperSpec"
            class="w-72"
            :options="SF_PAPER_SPEC_OPTIONS"
          />
        </Descriptions.Item>
        <Descriptions.Item label="队列任务">
          {{ queue.length }}
        </Descriptions.Item>
        <Descriptions.Item label="打印机 DPI">
          {{ printerInfo?.dpi || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="可用纸张">
          {{
            printerInfo?.papers
              .map(
                (paper) =>
                  `${paper.name || '自定义'} ${paper.widthMm}×${paper.heightMm}mm`,
              )
              .join('；') || '-'
          }}
        </Descriptions.Item>
        <Descriptions.Item label="测试状态" :span="2">
          {{ diagnosticStatus || '-' }}
        </Descriptions.Item>
      </Descriptions>
      <Button
        class="mt-3"
        type="primary"
        :disabled="!localConnected"
        @click="testPrint"
      >
        打印 {{ getSfPaperSpec(diagnosticPaperSpec).label }}
      </Button>
      <Alert
        class="mt-3"
        type="info"
        show-icon
        message="此处 JSSDK 只打印测试标签，不读取正式订单面单，也不会触发订单发货。"
      />
    </div>
  </Page>
</template>
