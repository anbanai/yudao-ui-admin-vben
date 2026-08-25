<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select';

import type { MemberUserApi } from '#/api/member/user';

import { computed, onMounted, ref } from 'vue';

import { Avatar, Select } from 'ant-design-vue';

import { getUserPage } from '#/api/member/user';

defineOptions({ name: 'WechatUserSelect' });

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
    placeholder: '输入昵称或手机号搜索打印员',
  },
);

const emit = defineEmits<{
  change: [value: string | undefined, user?: MemberUserApi.User];
}>();

const modelValue = defineModel<string>();

const userList = ref<MemberUserApi.User[]>([]);
const loading = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSeq = 0;

/** openid -> 会员信息，便于回显昵称 */
const userMap = computed(
  () =>
    new Map(
      userList.value
        .filter((item) => !!item.openid)
        .map((item) => [item.openid as string, item]),
    ),
);

function displayName(user: MemberUserApi.User) {
  return user.nickname || user.name || `会员${user.id}`;
}

const options = computed(() =>
  userList.value.map((item) => ({
    label: `${displayName(item)}${item.mobile ? ` ${item.mobile}` : ''}`,
    // 无 openid 的会员无法接收打单任务，用占位 value 保证可渲染并置灰
    value: item.openid ?? `member-${item.id}`,
    disabled: !item.openid,
    user: item,
  })),
);

async function loadUsers(keyword?: string) {
  const seq = ++searchSeq;
  loading.value = true;
  try {
    const trimmed = keyword?.trim();
    const isMobile = !!trimmed && /^\d+$/.test(trimmed);
    const page = await getUserPage({
      pageNo: 1,
      pageSize: 50,
      ...(trimmed
        ? isMobile
          ? { mobile: trimmed }
          : { nickname: trimmed }
        : {}),
    });
    // 丢弃过期响应，避免旧请求覆盖新结果
    if (seq !== searchSeq) return;
    userList.value = page.list;
  } finally {
    if (seq === searchSeq) {
      loading.value = false;
    }
  }
}

function handleSearch(keyword: string) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadUsers(keyword), 300);
}

function handleChange(value: SelectValue) {
  const openid = typeof value === 'string' ? value : undefined;
  if (!openid) {
    return;
  }
  const user = userMap.value.get(openid);
  // 兜底：无 openid 的会员不可选，忽略本次选择
  if (!user) {
    return;
  }
  emit('change', openid, user);
}

onMounted(() => loadUsers());

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
  >
    <template #option="option">
      <div class="flex min-w-0 items-center gap-2">
        <Avatar :src="option.user.avatar" size="small">
          {{ displayName(option.user).slice(0, 1) }}
        </Avatar>
        <span class="flex-shrink-0">{{ displayName(option.user) }}</span>
        <span v-if="option.user.mobile" class="text-gray-400">
          {{ option.user.mobile }}
        </span>
        <span class="min-w-0 truncate text-xs text-gray-400">
          openid：{{ option.user.openid ?? '无（未授权微信，不可选）' }}
        </span>
      </div>
    </template>
  </Select>
</template>
