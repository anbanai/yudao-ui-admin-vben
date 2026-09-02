<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select';

import type { SystemSocialUserApi } from '#/api/system/social/user';

import { computed, onMounted, ref } from 'vue';

import { Avatar, Select } from 'ant-design-vue';

import { getSocialUserPage } from '#/api/system/social/user';

defineOptions({ name: 'WechatUserSelect' });

const props = withDefaults(
  defineProps<{
    /** 是否允许清空 */
    allowClear?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 占位提示 */
    placeholder?: string;
    /** 社交类型：1=微信小程序用户；默认只选小程序用户 */
    type?: number;
  }>(),
  {
    allowClear: true,
    disabled: false,
    placeholder: '输入昵称搜索打印员',
    type: 1,
  },
);

const emit = defineEmits<{
  change: [value: string | undefined, user?: SystemSocialUserApi.SocialUser];
}>();

const modelValue = defineModel<string>();

const userList = ref<SystemSocialUserApi.SocialUser[]>([]);
const loading = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSeq = 0;

/** openid -> 小程序用户信息，便于回显昵称 */
const userMap = computed(
  () => new Map(userList.value.map((item) => [item.openid, item])),
);

function displayName(user: SystemSocialUserApi.SocialUser) {
  return user.nickname || `微信用户${user.id}`;
}

const options = computed(() =>
  userList.value.map((item) => ({
    label: `${displayName(item)}（openid: ${item.openid}）`,
    value: item.openid,
    disabled: !item.openid,
    user: item,
  })),
);

async function loadUsers(keyword?: string) {
  const seq = ++searchSeq;
  loading.value = true;
  try {
    const trimmed = keyword?.trim();
    const page = await getSocialUserPage({
      pageNo: 1,
      pageSize: 50,
      type: props.type,
      ...(trimmed ? { nickname: trimmed } : {}),
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
  // 兜底：无 openid 的用户不可选，忽略本次选择
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
        <span class="min-w-0 truncate text-xs text-muted-foreground">
          openid：{{ option.user.openid }}
        </span>
      </div>
    </template>
  </Select>
</template>
