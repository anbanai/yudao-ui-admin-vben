<script lang="ts" setup>
import type { MemberBenefitApi } from '#/api/member/benefit';
import type { MemberLevelApi } from '#/api/member/level';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Table,
  TabPane,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  adjustBenefitAccount,
  createBenefitDefinition,
  deleteBenefitDefinition,
  deleteLevelBenefitBinding,
  getBenefitAccountPage,
  getBenefitDefinitions,
  getBenefitLedgerPage,
  getLevelBenefitBindings,
  grantBenefitAccount,
  revokeBenefitAccount,
  saveLevelBenefitBinding,
  updateBenefitDefinition,
} from '#/api/member/benefit';
import { getLevelList } from '#/api/member/level';

type Operation = 'adjust' | 'grant' | 'revoke';
const loading = ref(false);
const saving = ref(false);
const activeTab = ref('matrix');
const definitions = ref<MemberBenefitApi.Definition[]>([]);
const bindings = ref<MemberBenefitApi.LevelBinding[]>([]);
const levels = ref<MemberLevelApi.Level[]>([]);
const accounts = ref<MemberBenefitApi.UserAccount[]>([]);
const ledgers = ref<MemberBenefitApi.Ledger[]>([]);
const accountPage = reactive({ pageNo: 1, pageSize: 20, total: 0 });
const ledgerPage = reactive({ pageNo: 1, pageSize: 20, total: 0 });
const userId = ref<number>();
const definitionOpen = ref(false);
const bindingOpen = ref(false);
const operationOpen = ref(false);
const operationType = ref<Operation>('grant');
const previewOpen = ref(false);
const copyTargetLevelId = ref<number>();
const definition = reactive<MemberBenefitApi.Definition>(emptyDefinition());
const binding = reactive<MemberBenefitApi.LevelBinding>(emptyBinding());
const operation = reactive({
  accountId: 0,
  bizId: '',
  quantity: 1,
  reason: '',
});

const periodNames: Record<number, string> = {
  1: '一次性',
  2: '自然季度',
  3: '会员年度',
  4: '生日',
};
const levelNames = computed(() =>
  Object.fromEntries(levels.value.map((item) => [item.id, item.name])),
);
const benefitNames = computed(() =>
  Object.fromEntries(definitions.value.map((item) => [item.id, item.name])),
);
const sortedLevels = computed(() =>
  levels.value.toSorted((a, b) => a.level - b.level),
);
const matrixRows = computed(() =>
  definitions.value.map((item) => ({ ...item, key: item.id })),
);
const copyTargets = computed(() =>
  sortedLevels.value.filter((item) => item.level > 1),
);
const previewLevel = computed(() =>
  sortedLevels.value.find((item) => item.id === copyTargetLevelId.value),
);
const previewItems = computed(() =>
  previewLevel.value
    ? definitions.value
        .map((definition) => ({
          definition,
          binding: bindingFor(previewLevel.value!.id!, definition.id),
        }))
        .filter((item) => item.binding)
    : [],
);

function emptyDefinition(): MemberBenefitApi.Definition {
  return { code: '', name: '', type: 1, actionType: 0, status: 0, sort: 0 };
}
function emptyBinding(): MemberBenefitApi.LevelBinding {
  return {
    levelId: 0,
    benefitId: 0,
    quantity: 1,
    periodType: 1,
    claimType: 0,
    status: 0,
    sort: 0,
  };
}
function bindingFor(levelId: number, benefitId?: number) {
  return bindings.value.find(
    (item) => item.levelId === levelId && item.benefitId === benefitId,
  );
}
async function loadConfig() {
  loading.value = true;
  try {
    const [items, levelItems, bindingItems] = await Promise.all([
      getBenefitDefinitions(),
      getLevelList({} as MemberLevelApi.Level),
      getLevelBenefitBindings(),
    ]);
    definitions.value = items;
    levels.value = levelItems;
    bindings.value = bindingItems;
  } catch {
    message.error('权益配置加载失败');
  } finally {
    loading.value = false;
  }
}
async function loadAccounts(pageNo = accountPage.pageNo) {
  loading.value = true;
  try {
    accountPage.pageNo = pageNo;
    const [accountResult, ledgerResult] = await Promise.all([
      getBenefitAccountPage({
        pageNo: accountPage.pageNo,
        pageSize: accountPage.pageSize,
        userId: userId.value,
      }),
      getBenefitLedgerPage({
        pageNo: ledgerPage.pageNo,
        pageSize: ledgerPage.pageSize,
        userId: userId.value,
      }),
    ]);
    accounts.value = accountResult.list;
    accountPage.total = accountResult.total;
    ledgers.value = ledgerResult.list;
    ledgerPage.total = ledgerResult.total;
  } catch {
    message.error('用户权益加载失败');
  } finally {
    loading.value = false;
  }
}
function changeAccountPage(page: number) {
  void loadAccounts(page);
}
function changeLedgerPage(page: number) {
  ledgerPage.pageNo = page;
  void loadAccounts(accountPage.pageNo);
}
function editDefinition(item?: MemberBenefitApi.Definition) {
  Object.assign(definition, emptyDefinition(), item || {});
  definitionOpen.value = true;
}
async function saveDefinition() {
  if (!definition.code.trim() || !definition.name.trim()) {
    message.warning('请填写权益编码和名称');
    return;
  }
  if (definition.actionType === 1 && !definition.couponTemplateId) {
    message.warning('券类权益需要配置优惠券模板');
    return;
  }
  saving.value = true;
  try {
    await (definition.id
      ? updateBenefitDefinition({ ...definition })
      : createBenefitDefinition({ ...definition }));
    definitionOpen.value = false;
    message.success('保存成功');
    await loadConfig();
  } finally {
    saving.value = false;
  }
}
async function removeDefinition(id: number) {
  await deleteBenefitDefinition(id);
  message.success('已删除');
  await loadConfig();
}
function editBinding(benefitId?: number, levelId?: number) {
  Object.assign(
    binding,
    emptyBinding(),
    bindingFor(levelId || 0, benefitId) || {},
    {
      benefitId: benefitId || 0,
      levelId: levelId || 0,
    },
  );
  bindingOpen.value = true;
}
async function saveBinding() {
  if (!binding.levelId || !binding.benefitId || binding.quantity < 1) {
    message.warning('请选择等级和权益，并填写有效数量');
    return;
  }
  saving.value = true;
  try {
    await saveLevelBenefitBinding({ ...binding });
    bindingOpen.value = false;
    message.success('保存成功');
    await loadConfig();
  } finally {
    saving.value = false;
  }
}
async function removeBinding(id: number) {
  await deleteLevelBenefitBinding(id);
  message.success('已移除');
  await loadConfig();
}
async function copyPreviousLevel() {
  const target = sortedLevels.value.find(
    (item) => item.id === copyTargetLevelId.value,
  );
  if (!target || target.level <= 1) return;
  const previous = sortedLevels.value.find(
    (item) => item.level === target.level - 1,
  );
  if (!previous) return;
  const sourceBindings = bindings.value.filter(
    (item) => item.levelId === previous.id,
  );
  if (sourceBindings.length === 0) {
    message.warning('上一等级暂无权益配置');
    return;
  }
  saving.value = true;
  try {
    await Promise.all(
      sourceBindings.map((source) => {
        const existing = bindingFor(target.id!, source.benefitId);
        return saveLevelBenefitBinding({
          ...source,
          id: existing?.id,
          levelId: target.id!,
        });
      }),
    );
    message.success(`已复制 ${previous.name} 配置到 ${target.name}`);
    await loadConfig();
  } finally {
    saving.value = false;
  }
}
function openPreview() {
  if (!copyTargetLevelId.value) {
    message.warning('请选择预览等级');
    return;
  }
  previewOpen.value = true;
}
function openOperation(accountId: number, type: Operation) {
  Object.assign(operation, { accountId, bizId: '', quantity: 1, reason: '' });
  operationType.value = type;
  operationOpen.value = true;
}
async function submitOperation() {
  if (
    !operation.bizId.trim() ||
    !operation.reason.trim() ||
    (operationType.value !== 'revoke' &&
      (!operation.quantity || !Number.isInteger(operation.quantity)))
  ) {
    message.warning('请填写业务单号、原因和有效数量');
    return;
  }
  saving.value = true;
  try {
    const data = { ...operation };
    if (operationType.value === 'grant') await grantBenefitAccount(data);
    else if (operationType.value === 'adjust') await adjustBenefitAccount(data);
    else await revokeBenefitAccount(data);
    operationOpen.value = false;
    message.success('操作成功');
    await loadAccounts();
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadConfig();
});
</script>

<template>
  <Page title="会员权益" description="配置等级权益与查看用户额度">
    <Tabs
      v-model:active-key="activeTab"
      @change="(key) => key === 'accounts' && loadAccounts()"
    >
      <TabPane key="matrix" tab="等级权益矩阵">
        <div class="toolbar">
          <Button type="primary" @click="editBinding()">配置权益</Button>
          <Select
            v-model:value="copyTargetLevelId"
            style="width: 150px"
            placeholder="选择目标等级"
          >
            <SelectOption
              v-for="level in copyTargets"
              :key="level.id"
              :value="level.id"
            >
              复制到 {{ level.name }}
            </SelectOption>
          </Select>
          <Button :loading="saving" @click="copyPreviousLevel">
            复制上一等级
          </Button>
          <Button @click="openPreview">预览用户端</Button>
          <Button @click="() => loadConfig()">刷新</Button>
        </div>
        <Table
          :data-source="matrixRows"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 900 }"
          row-key="id"
          bordered
          size="small"
        >
          <Table.Column
            title="权益"
            data-index="name"
            :width="180"
            fixed="left"
          />
          <Table.Column
            v-for="level in sortedLevels"
            :key="level.id"
            :title="level.name"
            :width="180"
          >
            <template #default="{ record }">
              <div class="matrix-cell" v-if="bindingFor(level.id!, record.id)">
                <span>{{ bindingFor(level.id!, record.id)?.quantity }} 次 /
                  {{
                    periodNames[
                      bindingFor(level.id!, record.id)?.periodType || 1
                    ]
                  }}</span>
                <Tag
                  v-if="bindingFor(level.id!, record.id)?.status !== 0"
                  color="default"
                >
                  已下线
                </Tag>
                <Button
                  type="link"
                  size="small"
                  @click="editBinding(record.id, level.id)"
                >
                  编辑
                </Button>
              </div>
              <Button
                v-else
                type="link"
                size="small"
                @click="editBinding(record.id, level.id)"
              >
                添加
              </Button>
            </template>
          </Table.Column>
        </Table>
      </TabPane>

      <TabPane key="definitions" tab="权益定义">
        <div class="toolbar">
          <Button type="primary" @click="editDefinition()">新增权益</Button><Button @click="loadConfig">刷新</Button>
        </div>
        <Table
          :data-source="definitions"
          :loading="loading"
          :pagination="{ pageSize: 20 }"
          row-key="id"
          size="small"
        >
          <Table.Column title="编码" data-index="code" /><Table.Column
            title="名称"
            data-index="name"
          />
          <Table.Column title="说明" data-index="description" />
          <Table.Column title="状态">
            <template #default="{ record }">
              <Tag :color="record.status === 0 ? 'green' : 'default'">
                {{ record.status === 0 ? '启用' : '停用' }}
              </Tag>
            </template>
          </Table.Column>
          <Table.Column title="操作" :width="150">
            <template #default="{ record }">
              <Button type="link" @click="editDefinition(record)">编辑</Button><Popconfirm
                title="确认删除此权益？"
                @confirm="removeDefinition(record.id)"
              >
                <Button type="link" danger>删除</Button>
              </Popconfirm>
            </template>
          </Table.Column>
        </Table>
      </TabPane>

      <TabPane key="accounts" tab="用户额度与流水">
        <div class="toolbar">
          <InputNumber
            v-model:value="userId"
            :min="1"
            :precision="0"
            placeholder="用户 ID"
          /><Button type="primary" @click="() => loadAccounts(1)">查询</Button>
        </div>
        <Table
          :data-source="accounts"
          :loading="loading"
          :pagination="{
            current: accountPage.pageNo,
            pageSize: accountPage.pageSize,
            total: accountPage.total,
            showSizeChanger: false,
          }"
          @change="(pagination) => changeAccountPage(pagination.current || 1)"
          row-key="id"
          size="small"
          :scroll="{ x: 1100 }"
        >
          <Table.Column title="用户 ID" data-index="userId" /><Table.Column
            title="等级"
          >
            <template #default="{ record }">
              {{ levelNames[record.levelId] || record.levelId }}
            </template>
          </Table.Column>
          <Table.Column title="权益">
            <template #default="{ record }">
              {{ benefitNames[record.benefitId] || record.benefitId }}
            </template>
          </Table.Column>
          <Table.Column title="已发 / 可用 / 已用">
            <template #default="{ record }">
              {{ record.grantedQuantity }} / {{ record.availableQuantity }} /
              {{ record.usedQuantity }}
            </template>
          </Table.Column>
          <Table.Column
            title="周期开始"
            data-index="periodStart"
          /><Table.Column title="周期结束" data-index="periodEnd" />
          <Table.Column title="操作" :width="200">
            <template #default="{ record }">
              <Button
                type="link"
                size="small"
                @click="openOperation(record.id, 'grant')"
              >
                补发
</Button><Button
                type="link"
                size="small"
                @click="openOperation(record.id, 'adjust')"
              >
                调整
</Button><Button
                type="link"
                size="small"
                danger
                @click="openOperation(record.id, 'revoke')"
              >
                撤销
              </Button>
            </template>
          </Table.Column>
        </Table>
        <h3 class="subheading">操作流水</h3>
        <Table
          :data-source="ledgers"
          :loading="loading"
          :pagination="{
            current: ledgerPage.pageNo,
            pageSize: ledgerPage.pageSize,
            total: ledgerPage.total,
            showSizeChanger: false,
          }"
          @change="(pagination) => changeLedgerPage(pagination.current || 1)"
          row-key="id"
          size="small"
          :scroll="{ x: 900 }"
        >
          <Table.Column title="用户 ID" data-index="userId" /><Table.Column
            title="账户 ID"
            data-index="accountId"
          /><Table.Column title="事件" data-index="eventType" />
          <Table.Column title="数量" data-index="quantity" /><Table.Column
            title="业务单号"
            data-index="bizId"
          /><Table.Column title="原因" data-index="reason" /><Table.Column
            title="操作人"
            data-index="operatorId"
          /><Table.Column title="时间" data-index="createTime" />
        </Table>
      </TabPane>
    </Tabs>

    <Modal
      v-model:open="definitionOpen"
      :title="definition.id ? '编辑权益' : '新增权益'"
      :confirm-loading="saving"
      @ok="saveDefinition"
    >
      <Form layout="vertical">
        <FormItem label="编码" required>
          <Input v-model:value="definition.code" :disabled="!!definition.id" />
        </FormItem>
        <FormItem label="名称" required>
          <Input v-model:value="definition.name" />
        </FormItem>
        <FormItem label="说明">
          <Input.TextArea v-model:value="definition.description" :rows="2" />
        </FormItem>
        <FormItem label="图标地址">
          <Input v-model:value="definition.icon" />
        </FormItem>
        <FormItem label="类型">
          <InputNumber
            v-model:value="definition.type"
            :min="1"
            :precision="0"
          />
        </FormItem>
        <FormItem label="动作类型">
          <Select v-model:value="definition.actionType">
            <SelectOption :value="0">展示</SelectOption><SelectOption :value="1">领取优惠券</SelectOption><SelectOption :value="2">申请服务</SelectOption>
          </Select>
        </FormItem>
        <FormItem
          v-if="definition.actionType === 1"
          label="优惠券模板 ID"
          required
        >
          <InputNumber
            v-model:value="definition.couponTemplateId"
            :min="1"
            :precision="0"
          />
        </FormItem>
        <FormItem label="状态">
          <Select v-model:value="definition.status">
            <SelectOption :value="0">启用</SelectOption><SelectOption :value="1">停用</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="排序">
          <InputNumber
            v-model:value="definition.sort"
            :min="0"
            :precision="0"
          />
        </FormItem>
      </Form>
    </Modal>
    <Modal
      v-model:open="bindingOpen"
      title="配置等级权益"
      :confirm-loading="saving"
      @ok="saveBinding"
    >
      <Form layout="vertical">
        <FormItem label="等级" required>
          <Select v-model:value="binding.levelId">
            <SelectOption
              v-for="level in sortedLevels"
              :key="level.id"
              :value="level.id"
            >
              {{ level.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="权益" required>
          <Select v-model:value="binding.benefitId">
            <SelectOption
              v-for="item in definitions"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="数量" required>
          <InputNumber
            v-model:value="binding.quantity"
            :min="0"
            :precision="0"
          />
        </FormItem>
        <FormItem label="周期">
          <Select v-model:value="binding.periodType">
            <SelectOption
              v-for="(name, key) in periodNames"
              :key="key"
              :value="Number(key)"
            >
              {{ name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="领取方式">
          <Select v-model:value="binding.claimType">
            <SelectOption :value="0">自动到账</SelectOption><SelectOption :value="1">主动领取</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="有效天数">
          <InputNumber
            v-model:value="binding.validityDays"
            :min="1"
            :precision="0"
          />
        </FormItem>
        <FormItem label="排序">
          <InputNumber v-model:value="binding.sort" :min="0" :precision="0" />
        </FormItem>
        <FormItem label="状态">
          <Select v-model:value="binding.status">
            <SelectOption :value="0">上线</SelectOption><SelectOption :value="1">下线</SelectOption>
          </Select>
        </FormItem>
        <Popconfirm
          v-if="binding.id"
          title="确认移除此等级权益？"
          @confirm="
            removeBinding(binding.id!).then(() => (bindingOpen = false))
          "
        >
          <Button danger>移除配置</Button>
        </Popconfirm>
      </Form>
    </Modal>
    <Modal
      v-model:open="operationOpen"
      :title="
        { grant: '补发权益', revoke: '撤销权益', adjust: '调整额度' }[
          operationType
        ]
      "
      :confirm-loading="saving"
      @ok="submitOperation"
    >
      <Form layout="vertical">
        <FormItem label="业务单号" required>
          <Input v-model:value="operation.bizId" :maxlength="64" />
        </FormItem>
        <FormItem
          v-if="operationType !== 'revoke'"
          :label="
            operationType === 'adjust' ? '调整数量（可为负数）' : '补发数量'
          "
          required
        >
          <InputNumber
            v-model:value="operation.quantity"
            :precision="0"
            :min="operationType === 'grant' ? 1 : undefined"
          />
        </FormItem>
        <FormItem label="原因" required>
          <Input.TextArea
            v-model:value="operation.reason"
            :rows="3"
            :maxlength="255"
          />
        </FormItem>
      </Form>
    </Modal>
    <Modal
      v-model:open="previewOpen"
      :title="`${previewLevel?.name || ''} 用户端权益预览`"
      :footer="null"
      width="620px"
    >
      <div class="preview-card">
        <div class="preview-header">
          <div class="preview-eyebrow">TEA MEMBERSHIP</div>
          <div class="preview-level">
            {{ previewLevel?.name || '会员等级' }}
          </div>
          <div class="preview-note">
            松针绿主色、纸白背景与清晰的额度和有效期信息
          </div>
        </div>
        <div v-if="!previewItems.length" class="preview-empty">
          该等级暂未配置权益
        </div>
        <div
          v-for="item in previewItems"
          :key="item.definition.id"
          class="preview-row"
        >
          <div class="preview-icon">{{ item.definition.name.slice(0, 1) }}</div>
          <div class="preview-main">
            <div class="preview-name">{{ item.definition.name }}</div>
            <div class="preview-meta">
              剩余 {{ item.binding?.quantity }} 次 ·
              {{ periodNames[item.binding?.periodType || 1] }}
            </div>
          </div>
          <Tag v-if="item.binding?.claimType === 1" color="volcano">待领取</Tag>
          <Tag v-else color="green">已到账</Tag>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 8px 0 16px;
}

.matrix-cell {
  display: flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
}

.subheading {
  margin: 28px 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.preview-card {
  color: #17211b;
}

.preview-header {
  padding: 24px;
  color: #fff;
  background: #1f4a38;
  border-radius: 8px;
}

.preview-eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  opacity: 0.72;
}

.preview-level {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
}

.preview-note {
  margin-top: 14px;
  font-size: 12px;
  opacity: 0.78;
}

.preview-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 4px;
  border-bottom: 1px solid #e5e9e3;
}

.preview-icon {
  width: 34px;
  height: 34px;
  line-height: 34px;
  color: #1f4a38;
  text-align: center;
  background: #e2eee6;
  border-radius: 50%;
}

.preview-main {
  flex: 1;
  min-width: 0;
}

.preview-name {
  font-weight: 600;
}

.preview-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #65756a;
}

.preview-empty {
  padding: 32px 0;
  color: #778279;
  text-align: center;
}
</style>
