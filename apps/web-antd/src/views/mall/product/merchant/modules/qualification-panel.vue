<script lang="ts" setup>
import type { MallMerchantApi } from '#/api/mall/product/merchant';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message, Table, Tag } from 'ant-design-vue';

import {
  approveMerchantQualification,
  deleteMerchantQualification,
  getMerchantQualifications,
  rejectMerchantQualification,
} from '#/api/mall/product/merchant';

import { qualificationStatusLabel } from '../data';
import QualificationForm from './qualification-form.vue';

const emit = defineEmits<{ success: [] }>();
const merchant = ref<MallMerchantApi.Merchant>();
const qualifications = ref<MallMerchantApi.Qualification[]>([]);
const loading = ref(false);
const [QualificationFormModal, qualificationFormApi] = useVbenModal({
  connectedComponent: QualificationForm,
  destroyOnClose: true,
});

async function load() {
  if (!merchant.value?.id) return;
  loading.value = true;
  try {
    qualifications.value = await getMerchantQualifications(merchant.value.id);
  } finally {
    loading.value = false;
  }
}

function openQualification(data?: MallMerchantApi.Qualification) {
  qualificationFormApi
    .setData(data ?? { merchantId: merchant.value?.id })
    .open();
}

async function removeQualification(row: MallMerchantApi.Qualification) {
  await deleteMerchantQualification(row.id!);
  message.success('删除成功');
  await load();
}

async function reviewQualification(
  row: MallMerchantApi.Qualification,
  approve: boolean,
) {
  await (approve
    ? approveMerchantQualification(row.id!)
    : rejectMerchantQualification(row.id!));
  message.success('操作成功');
  await load();
}

const [ModalView, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      merchant.value = undefined;
      qualifications.value = [];
      return;
    }
    merchant.value = modalApi.getData() as MallMerchantApi.Merchant;
    await load();
  },
});

function close() {
  modalApi.close();
  emit('success');
}
</script>

<template>
  <ModalView title="商家详情与资质" class="w-[900px]" @cancel="close">
    <div class="mb-4 grid grid-cols-2 gap-3 text-sm">
      <div>商家名称：{{ merchant?.name || '-' }}</div>
      <div>店铺名称：{{ merchant?.storeName || '-' }}</div>
      <div>企业主体：{{ merchant?.companyName || '-' }}</div>
      <div>统一社会信用代码：{{ merchant?.creditCode || '-' }}</div>
      <div>法人：{{ merchant?.legalPerson || '-' }}</div>
      <div>
        联系人：{{ merchant?.contactName || '-' }}
        {{ merchant?.contactMobile || '' }}
      </div>
    </div>
    <div class="mb-2 flex items-center justify-between">
      <span class="text-base font-medium">资质证件</span>
      <a-button type="primary" @click="openQualification()">新增资质</a-button>
    </div>
    <Table
      :data-source="qualifications"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
    >
      <Table.Column key="type" title="资质类型" data-index="type" />
      <Table.Column
        key="certificateNo"
        title="证件编号"
        data-index="certificateNo"
      />
      <Table.Column key="validEnd" title="有效期至" data-index="validEnd" />
      <Table.Column key="status" title="审核状态" data-index="status">
        <template #default="{ record }">
          <Tag>{{ qualificationStatusLabel(record.status) }}</Tag>
        </template>
      </Table.Column>
      <Table.Column key="actions" title="操作" :width="260">
        <template #default="{ record }">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="openQualification(record)"
            >
              编辑
            </a-button>
            <a-button
              v-if="record.status === 10"
              type="link"
              size="small"
              @click="reviewQualification(record, true)"
            >
              通过
            </a-button>
            <a-button
              v-if="record.status === 10"
              type="link"
              size="small"
              @click="reviewQualification(record, false)"
            >
              驳回
            </a-button>
            <a-popconfirm
              title="确认删除该资质吗？"
              @confirm="removeQualification(record)"
            >
              <a-button type="link" danger size="small">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </Table.Column>
    </Table>
    <QualificationFormModal @success="load" />
  </ModalView>
</template>
