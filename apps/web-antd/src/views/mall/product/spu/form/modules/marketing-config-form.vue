<script lang="ts" setup>
import type { MemberGroupApi } from '#/api/member/group';
import type { MemberLevelApi } from '#/api/member/level';

import { computed, onMounted, ref } from 'vue';

import { Alert, InputNumber, Select, message } from 'ant-design-vue';

import { getSimpleGroupList } from '#/api/member/group';
import { getSimpleLevelList } from '#/api/member/level';

import {
  isValidMarketingConfig,
  normalizeMarketingConfig,
  setMarketingMemberLevels,
  setMarketingUserGroups,
  setUserGroupPurchaseLimit,
  type ProductMarketingConfig,
} from '../marketing-config';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue?: ProductMarketingConfig;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: ProductMarketingConfig];
}>();

const levels = ref<MemberLevelApi.Level[]>([]);
const groups = ref<MemberGroupApi.Group[]>([]);
const loadFailed = ref(false);
const config = computed(() => normalizeMarketingConfig(props.modelValue));
const configInvalid = computed(() => !isValidMarketingConfig(props.modelValue));
const levelOptions = computed(() =>
  levels.value.flatMap((item) =>
    item.id ? [{ label: `${item.name} (L${item.level})`, value: item.id }] : [],
  ),
);
const groupOptions = computed(() =>
  groups.value.flatMap((item) => (item.id ? [{ label: item.name, value: item.id }] : [])),
);

function update(next: ProductMarketingConfig) {
  emit('update:modelValue', next);
}

function getGroupLabel(id: number) {
  return groupOptions.value.find((item) => item.value === id)?.label ?? `${id}`;
}

onMounted(async () => {
  try {
    [levels.value, groups.value] = await Promise.all([getSimpleLevelList(), getSimpleGroupList()]);
  } catch {
    loadFailed.value = true;
    message.error('会员等级或客户标签加载失败');
  }
});
</script>

<template>
  <div class="space-y-4">
    <Alert
      v-if="loadFailed"
      type="error"
      show-icon
      message="会员等级或客户标签加载失败"
      description="已保存的规则仍会保留；请刷新后再调整人群配置。"
    />
    <Alert
      v-if="configInvalid"
      type="error"
      show-icon
      message="已保存的人群配置无效"
      description="当前规则保持不变；请先修复会员等级、客户标签或限购数据。"
    />
    <div class="grid gap-4 md:grid-cols-2">
      <label class="block space-y-2">
        <span>允许的会员等级</span>
        <Select
          :value="config.memberLevels"
          class="w-full"
          mode="multiple"
          :options="levelOptions"
          :disabled="disabled || loadFailed || configInvalid"
          placeholder="不限制会员等级"
          @change="update(setMarketingMemberLevels(modelValue, $event))"
        />
      </label>
      <label class="block space-y-2">
        <span>客户标签</span>
        <Select
          :value="config.userGroups"
          class="w-full"
          mode="multiple"
          :options="groupOptions"
          :disabled="disabled || loadFailed || configInvalid"
          placeholder="不限制客户标签"
          @change="update(setMarketingUserGroups(modelValue, $event))"
        />
      </label>
    </div>
    <div v-if="config.userGroups.length" class="space-y-3">
      <div class="text-sm font-medium">标签限购</div>
      <div
        v-for="groupId in config.userGroups"
        :key="groupId"
        class="grid grid-cols-[minmax(0,1fr)_160px] items-center gap-3"
      >
        <span>{{ getGroupLabel(groupId) }}</span>
        <InputNumber
          :value="config.userGroupPurchaseLimits?.[String(groupId)]"
          class="w-full"
          :min="0"
          :precision="0"
          :disabled="disabled || configInvalid"
          placeholder="不限购"
          @change="update(setUserGroupPurchaseLimit(modelValue, groupId, $event))"
        />
      </div>
    </div>
  </div>
</template>
