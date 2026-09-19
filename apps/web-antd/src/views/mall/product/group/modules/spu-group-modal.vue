<script setup lang="ts">
import type { MallProductGroupApi } from '#/api/mall/product/group';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { CommonStatusEnum } from '@vben/constants';

import { message, RadioGroup, Select } from 'ant-design-vue';

import {
  getGroupLabel,
  getSimpleGroupList,
  updateSpuGroups,
} from '#/api/mall/product/group';

import { buildSpuGroupUpdate } from '../operations';

const emit = defineEmits<{ success: [] }>();
const spuIds = ref<number[]>([]);
const groupIds = ref<number[]>([]);
const operation = ref<'add' | 'remove'>('add');
const groups = ref<MallProductGroupApi.Group[]>([]);
const options = computed(() =>
  groups.value.map((group) => ({
    label: getGroupLabel(group),
    value: group.id,
    disabled:
      operation.value === 'add' && group.status !== CommonStatusEnum.ENABLE,
  })),
);

watch(operation, (value) => {
  if (value === 'add') {
    const enabled = new Set(
      groups.value
        .filter((group) => group.status === CommonStatusEnum.ENABLE)
        .map((group) => group.id),
    );
    groupIds.value = groupIds.value.filter((id) => enabled.has(id));
  }
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    let data: MallProductGroupApi.SpuBatchUpdateRequest;
    try {
      data = buildSpuGroupUpdate(spuIds.value, groupIds.value, operation.value);
    } catch (error) {
      message.warning((error as Error).message);
      return;
    }
    modalApi.lock();
    try {
      await updateSpuGroups(data);
      message.success(
        operation.value === 'add' ? '商品已加入所选分组' : '商品已移出所选分组',
      );
      await modalApi.close();
      emit('success');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const data = modalApi.getData() as {
      operation?: 'add' | 'remove';
      spuIds: number[];
    };
    spuIds.value = [...data.spuIds];
    operation.value = data.operation ?? 'add';
    groupIds.value = [];
    modalApi.lock();
    try {
      groups.value = await getSimpleGroupList();
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal title="调整商品分组" class="w-[560px]">
    <div class="space-y-5 p-4">
      <p>已选择 {{ spuIds.length }} 件商品，每次最多处理 200 件。</p>
      <RadioGroup
        v-model:value="operation"
        :options="[
          { label: '加入分组', value: 'add' },
          { label: '移出分组', value: 'remove' },
        ]"
      />
      <Select
        v-model:value="groupIds"
        class="w-full"
        mode="multiple"
        :options="options"
        allow-clear
        show-search
        option-filter-prop="label"
        placeholder="请选择分组（最多15个）"
      />
      <p class="text-muted-foreground">
        仅调整所选分组的成员关系。停用分组可移出成员。
      </p>
    </div>
  </Modal>
</template>
