<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';
import type { MemberTagApi } from '#/api/member/tag';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { CouponTemplateTakeTypeEnum } from '@vben/constants';

import {
  Alert,
  Button,
  Input,
  InputNumber,
  message,
  Select,
} from 'ant-design-vue';

import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  cancelCouponSendBatch,
  getCouponSendBatch,
  previewCouponSend,
  submitCouponSend,
} from '#/api/mall/promotion/coupon/coupon';
import { getCouponTemplatePage } from '#/api/mall/promotion/coupon/couponTemplate';
import { getSimpleTagList } from '#/api/member/tag';

import SendConfirmation from './send-confirmation.vue';
import { useFormSchema, useGridColumns } from './send-form-data';
import { createCouponSendSession, parseMobileList } from './send-session';

const mobilesText = ref('');
const tagIds = ref<number[]>([]);
const tags = ref<MemberTagApi.Tag[]>([]);
const userIds = ref<number[]>([]);
const batchLookup = ref<number>();
const importBusy = ref(false);
const phones = computed(() => parseMobileList(mobilesText.value));
const session = createCouponSendSession(
  {
    cancel: cancelCouponSendBatch,
    preview: previewCouponSend,
    submit: submitCouponSend,
    read: getCouponSendBatch,
  },
  sessionStorage,
);
const state = session.state;

async function loadTags() {
  tags.value = await getSimpleTagList();
}
async function importMobiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    message.error('文件不能超过 1MB');
    input.value = '';
    return;
  }
  importBusy.value = true;
  try {
    mobilesText.value = await file.text();
  } catch {
    message.error('读取失败，请重试或粘贴手机号');
  } finally {
    importBusy.value = false;
    input.value = '';
  }
}
async function handlePreview(row: MallCouponTemplateApi.CouponTemplate) {
  if (
    phones.value.invalid.length > 0 ||
    phones.value.mobiles.length > 5000 ||
    tagIds.value.length > 100
  ) {
    message.error('请修正名单或缩小范围');
    return;
  }
  if (
    userIds.value.length === 0 &&
    phones.value.mobiles.length === 0 &&
    tagIds.value.length === 0
  ) {
    message.error('请先选择会员、导入手机号或选择标签');
    return;
  }
  modalApi.lock();
  try {
    const batch = await session.preview({
      templateId: row.id,
      userIds: userIds.value,
      mobiles: phones.value.mobiles,
      tagIds: tagIds.value,
    });
    batchLookup.value = batch.id;
    sessionStorage.setItem('marketing-coupon-batch-id', String(batch.id));
  } catch (error) {
    message.error(error instanceof Error ? error.message : '预检失败');
  } finally {
    modalApi.unlock();
  }
}
async function handleConfirm() {
  modalApi.lock();
  try {
    await session.confirm();
  } catch {
    message.error('提交未确认，请保留批次号，查询结果或重试同一批次');
  } finally {
    modalApi.unlock();
  }
}
async function handleRecover() {
  if (!batchLookup.value) return;
  try {
    await session.recover(batchLookup.value);
  } catch {
    message.error('查询失败，请检查批次号和查询权限后重试');
  }
}
async function handleDiscard() {
  modalApi.lock();
  try {
    await session.discard();
  } catch {
    message.error('作废结果待确认，请查询当前批次，勿新建批次');
  } finally {
    modalApi.unlock();
  }
}
const [Grid] = useVbenVxeGrid({
  formOptions: { schema: useFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 400,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          getCouponTemplatePage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
            canTakeTypes: [CouponTemplateTakeTypeEnum.ADMIN.type],
            status: 0,
          }),
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeGridProps<MallCouponTemplateApi.CouponTemplate>,
});
const [Modal, modalApi] = useVbenModal({
  showCancelButton: false,
  showConfirmButton: false,
  onBeforeClose: () => !state.busy && !state.uncertain,
  async onOpenChange(open: boolean) {
    if (open) {
      userIds.value =
        (modalApi.getData() as { userIds?: number[] })?.userIds ?? [];
      batchLookup.value =
        Number(
          sessionStorage.getItem('marketing-coupon-pending-batch') ||
            sessionStorage.getItem('marketing-coupon-batch-id'),
        ) || undefined;
      try {
        await session.restore();
      } catch {
        message.error('存在待确认批次，请查询恢复后继续');
      }
    }
  },
});
</script>
<template>
  <Modal title="发放优惠券" class="w-3/4">
    <div class="mb-4 space-y-3">
      <div
        v-access:code="['promotion:coupon:query']"
        class="flex items-center gap-2"
      >
        <InputNumber
          v-model:value="batchLookup"
          :min="1"
          :precision="0"
          placeholder="历史批次号"
        />
        <Button :loading="state.busy" @click="handleRecover">
          恢复批次结果
        </Button>
      </div>
      <SendConfirmation
        v-if="state.batch"
        :batch="state.batch"
        :busy="state.busy"
        :uncertain="state.uncertain"
        @confirm="handleConfirm"
        @cancel="session.cancel"
        @recover="handleRecover"
        @discard="handleDiscard"
      />
      <Alert
        v-else-if="state.uncertain"
        type="warning"
        message="存在提交结果待确认的批次，请使用上方批次号恢复结果后继续。"
      />
      <template v-else>
        <p>
          已选择会员
          {{ userIds.length }}
          人。手机号、标签与会员取并集，以预检返回的账号快照为准。
        </p>
        <div>
          <p>导入手机号（UTF-8 TXT / 单列 CSV，不含表头；每批最多 5000 个）</p>
          <input
            type="file"
            accept=".txt,.csv"
            aria-label="导入手机号名单"
            :disabled="importBusy"
            @change="importMobiles"
          />
        </div>
        <Input.TextArea
          v-model:value="mobilesText"
          :rows="3"
          placeholder="手机号以换行、逗号、分号或空格分隔"
        />
        <p>
          有效手机号 {{ phones.mobiles.length }} 个（已去重）；无效项
          {{ phones.invalid.length }} 个
        </p>
        <p v-if="phones.invalid.length" class="text-red-600">
          {{ phones.invalid.slice(0, 50).join('，') }}
        </p>
        <div class="flex items-center gap-2">
          <Select
            v-model:value="tagIds"
            class="w-2/3"
            mode="multiple"
            placeholder="选择会员标签（取并集，最多100个）"
            :options="tags.map((tag) => ({ label: tag.name, value: tag.id }))"
          /><Button @click="loadTags">加载标签</Button>
        </div>
      </template>
    </div>
    <Grid v-if="!state.batch && !state.uncertain">
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '预检发放',
              type: 'link',
              auth: ['promotion:coupon:send'],
              disabled: state.busy || importBusy || phones.invalid.length > 0,
              onClick: () => handlePreview(row),
            },
          ]"
        />
      </template>
    </Grid>
  </Modal>
</template>
