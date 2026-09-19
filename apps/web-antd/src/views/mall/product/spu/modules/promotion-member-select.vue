<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select';

import type { MemberUserApi } from '#/api/member/user';

import { computed, ref } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Avatar, Select, Spin } from 'ant-design-vue';

import { getUserPage } from '#/api/member/user';

defineOptions({ name: 'PromotionMemberSelect' });

const props = withDefaults(
  defineProps<{
    allowClear?: boolean;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    allowClear: true,
    disabled: false,
    placeholder: '搜索会员昵称或手机号',
  },
);

const emit = defineEmits<{
  change: [member?: MemberUserApi.User];
}>();

const modelValue = defineModel<number>();
const members = ref<MemberUserApi.User[]>([]);
const memberCache = new Map<number, MemberUserApi.User>();
const loading = ref(false);
let requestId = 0;

function buildSearchParams(keyword: string) {
  const value = keyword.trim();
  const params = { pageNo: 1, pageSize: 20 } as {
    mobile?: string;
    nickname?: string;
    pageNo: number;
    pageSize: number;
  };
  if (/^\d+$/.test(value) && value) {
    params.mobile = value;
  } else if (value) {
    params.nickname = value;
  }
  return params;
}

function displayName(member: MemberUserApi.User) {
  return member.nickname || member.name || `会员${member.id ?? ''}`;
}

function displayLabel(member: MemberUserApi.User) {
  const baseLabel = `${displayName(member)}（会员${member.id ?? '-'}）`;
  return member.mobile
    ? `${baseLabel} · 手机尾号 ${member.mobile.slice(-4)}`
    : baseLabel;
}

const options = computed(() =>
  members.value.map((member) => ({
    label: displayLabel(member),
    value: member.id as number,
    member,
  })),
);

async function searchMembers(keyword: string) {
  const currentRequestId = ++requestId;
  loading.value = true;
  try {
    const page = await getUserPage(buildSearchParams(keyword));
    if (currentRequestId !== requestId) return;
    members.value = page.list;
    for (const member of page.list) {
      if (member.id !== undefined) memberCache.set(member.id, member);
    }
  } finally {
    if (currentRequestId === requestId) loading.value = false;
  }
}

const search = useDebounceFn(searchMembers, 300);

function handleChange(value: SelectValue) {
  const id = typeof value === 'number' ? value : undefined;
  modelValue.value = id;
  emit('change', id === undefined ? undefined : memberCache.get(id));
}

defineExpose({ handleChange, options, search });
</script>

<template>
  <Select
    v-model:value="modelValue"
    :allow-clear="props.allowClear"
    :disabled="props.disabled"
    :filter-option="false"
    :loading="loading"
    :options="options"
    :placeholder="props.placeholder"
    class="w-full"
    show-search
    @change="handleChange"
    @search="search"
  >
    <template #option="option">
      <div class="flex min-w-0 items-center gap-2">
        <Avatar size="small">
          {{ displayName(option.member).slice(0, 1) }}
        </Avatar>
        <span class="min-w-0 truncate">{{ displayLabel(option.member) }}</span>
      </div>
    </template>
    <template #notFoundContent>
      <Spin v-if="loading" size="small" />
    </template>
  </Select>
</template>
