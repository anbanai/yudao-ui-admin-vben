<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select';

import type { MemberUserApi } from '#/api/member/user';

import { computed, onMounted, ref } from 'vue';

import { Select } from 'ant-design-vue';

import { getUserPage } from '#/api/member/user';

defineOptions({ name: 'MemberUserSelect' });

const props = withDefaults(
  defineProps<{
    /** 是否允许清空 */
    allowClear?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 占位提示 */
    placeholder?: string;
  }>(),
  {
    allowClear: true,
    disabled: false,
    placeholder: '搜索并选择员工（小程序用户）',
  },
);

const emit = defineEmits<{
  change: [value: string | undefined, user?: MemberUserApi.User];
}>();

const modelValue = defineModel<string>();

const userList = ref<MemberUserApi.User[]>([]);
const loading = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

/** openid -> 用户信息，便于回显昵称 */
const userMap = computed(
  () => new Map(userList.value.map((item) => [item.openid, item])),
);

const options = computed(() =>
  userList.value.map((item) => ({
    label: item.openid
      ? `${item.nickname}（${item.openid}）`
      : `${item.nickname}（未绑定微信，不可选）`,
    value: item.openid,
    // 没有 openid 无法用于微信打单绑定，置灰禁止选择
    disabled: !item.openid,
  })),
);

async function loadUsers(nickname?: string) {
  loading.value = true;
  try {
    const page = await getUserPage({
      pageNo: 1,
      pageSize: 50,
      ...(nickname ? { nickname } : {}),
    });
    userList.value = page.list;
  } finally {
    loading.value = false;
  }
}

function handleSearch(keyword: string) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadUsers(keyword.trim() || undefined), 300);
}

function handleChange(value: SelectValue) {
  const openid = value as string | undefined;
  // 兜底：无 openid 不可选，忽略本次选择
  if (!openid) {
    return;
  }
  const user = userMap.value.get(openid);
  emit('change', openid, user);
}

onMounted(loadUsers);

defineExpose({ userMap });
</script>

<template>
  <Select
    :value="modelValue"
    :loading="loading"
    :allow-clear="allowClear"
    :disabled="disabled"
    :options="options"
    show-search
    :filter-option="false"
    :placeholder="placeholder"
    class="w-full"
    @search="handleSearch"
    @change="
      (v: SelectValue) => {
        modelValue = v as string | undefined;
        handleChange(v);
      }
    "
  />
</template>
