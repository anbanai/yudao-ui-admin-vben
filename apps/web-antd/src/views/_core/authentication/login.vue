<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import type { AuthApi } from '#/api/core/auth';
import type { AuthMode } from '#/store/auth';

import { computed, onMounted, ref } from 'vue';

import {
  AuthenticationLogin,
  AuthenticationRegister,
  Verification,
  z,
} from '@vben/common-ui';
import { isCaptchaEnable, isTenantEnable } from '@vben/hooks';
import { $t } from '@vben/locales';
import { useAccessStore } from '@vben/stores';

import { Button as AButton, Segmented as ASegmented } from 'ant-design-vue';

import {
  checkCaptcha,
  getCaptcha,
  getTenantByWebsite,
  getTenantSimpleList,
} from '#/api/core/auth';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const accessStore = useAccessStore();
const tenantEnable = isTenantEnable();
const captchaEnable = isCaptchaEnable();

const loginRef = ref();
const verifyRef = ref();

const captchaType = 'blockPuzzle'; // 验证码类型：'blockPuzzle' | 'clickWord'
const isRegister = ref(false);
const isMerchantMode = computed(() => authStore.authMode === 'merchant');

/** 获取租户列表，并默认选中 */
const tenantList = ref<AuthApi.TenantResult[]>([]); // 租户列表
async function fetchTenantList() {
  if (!tenantEnable || isMerchantMode.value) {
    return;
  }
  try {
    // 获取租户列表、域名对应租户
    const websiteTenantPromise = getTenantByWebsite(window.location.hostname);
    tenantList.value = await getTenantSimpleList();

    // 选中租户：域名 > store 中的租户 > 首个租户
    let tenantId: null | number = null;
    const websiteTenant = await websiteTenantPromise;
    if (websiteTenant?.id) {
      tenantId = websiteTenant.id;
    }
    // 如果没有从域名获取到租户，尝试从 store 中获取
    if (!tenantId && accessStore.tenantId) {
      tenantId = accessStore.tenantId;
    }
    // 如果还是没有租户，使用列表中的第一个
    if (!tenantId && tenantList.value?.[0]?.id) {
      tenantId = tenantList.value[0].id;
    }

    // 设置选中的租户编号
    accessStore.setTenantId(tenantId);
    loginRef.value.getFormApi().setFieldValue('tenantId', tenantId?.toString());
  } catch (error) {
    console.error('获取租户列表失败:', error);
  }
}

/** 处理登录 */
async function handleLogin(values: any) {
  if (isMerchantMode.value) {
    await authStore.authLogin('username', values);
    return;
  }
  // 如果开启验证码，则先验证验证码
  if (captchaEnable) {
    verifyRef.value.show();
    return;
  }
  // 无验证码，直接登录
  await authStore.authLogin('username', values);
}

async function handleMerchantRegister(values: Record<string, string>) {
  await authStore.registerMerchantAccount({
    username: values.username ?? '',
    nickname: values.nickname ?? '',
    mobile: values.mobile ?? '',
    password: values.password ?? '',
  });
  await authStore.authLogin('username', {
    username: values.username ?? '',
    password: values.password ?? '',
  });
}

function handleModeChange(value: number | string) {
  authStore.setAuthMode(value as AuthMode);
  isRegister.value = false;
  if (value === 'admin') void fetchTenantList();
}

/** 验证码通过，执行登录 */
async function handleVerifySuccess({ captchaVerification }: any) {
  try {
    await authStore.authLogin('username', {
      ...(await loginRef.value.getFormApi().getValues()),
      captchaVerification,
    });
  } catch (error) {
    console.error('Error in handleLogin:', error);
  }
}

/** 组件挂载时获取租户信息 */
onMounted(() => {
  fetchTenantList();
});

const formSchema = computed((): VbenFormSchema[] => {
  if (isMerchantMode.value) {
    return [
      {
        component: 'VbenInput',
        componentProps: { placeholder: '请输入商家账号' },
        fieldName: 'username',
        label: '商家账号',
        rules: z.string().min(1, { message: '请输入商家账号' }),
      },
      {
        component: 'VbenInputPassword',
        componentProps: { placeholder: '请输入密码' },
        fieldName: 'password',
        label: '密码',
        rules: z.string().min(1, { message: '请输入密码' }),
      },
    ];
  }

  return [
    {
      component: 'VbenSelect',
      componentProps: {
        options: tenantList.value.map((item) => ({
          label: item.name,
          value: item.id.toString(),
        })),
        placeholder: $t('authentication.tenantTip'),
        onChange: (tenantId: string) => {
          if (tenantId) accessStore.setTenantId(Number(tenantId));
        },
      },
      fieldName: 'tenantId',
      label: $t('authentication.tenant'),
      rules: z.string().min(1, { message: $t('authentication.tenantTip') }),
      hide: !tenantEnable,
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.usernameTip') })
        .default(import.meta.env.VITE_APP_DEFAULT_USERNAME),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.passwordTip'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.passwordTip') })
        .default(import.meta.env.VITE_APP_DEFAULT_PASSWORD),
    },
  ];
});

const merchantRegisterSchema = computed((): VbenFormSchema[] => [
  {
    component: 'VbenInput',
    componentProps: { placeholder: '请输入商家账号' },
    fieldName: 'username',
    label: '商家账号',
    rules: z.string().min(1, { message: '请输入商家账号' }),
  },
  {
    component: 'VbenInput',
    componentProps: { placeholder: '请输入联系人或店铺昵称' },
    fieldName: 'nickname',
    label: '昵称',
    rules: z.string().min(1, { message: '请输入昵称' }),
  },
  {
    component: 'VbenInput',
    componentProps: { placeholder: '请输入手机号码' },
    fieldName: 'mobile',
    label: '手机号码',
    rules: z.string().min(11, { message: '请输入有效手机号码' }),
  },
  {
    component: 'VbenInputPassword',
    componentProps: {
      passwordStrength: true,
      placeholder: '请输入密码',
    },
    fieldName: 'password',
    label: '密码',
    rules: z.string().min(8, { message: '密码至少 8 位' }),
  },
  {
    component: 'VbenInputPassword',
    componentProps: { placeholder: '请再次输入密码' },
    dependencies: {
      triggerFields: ['password'],
      resolve: ({ values }) => ({
        rules: z
          .string()
          .min(1, { message: '请再次输入密码' })
          .refine((value) => value === values.password, {
            message: '两次输入的密码不一致',
          }),
      }),
    },
    fieldName: 'confirmPassword',
    label: '确认密码',
  },
]);
</script>

<template>
  <div class="w-full">
    <ASegmented
      class="mb-5 w-full"
      :options="[
        { label: '平台管理', value: 'admin' },
        { label: '商家入口', value: 'merchant' },
      ]"
      :value="authStore.authMode"
      @change="handleModeChange"
    />
    <AuthenticationRegister
      v-if="isRegister"
      :form-schema="merchantRegisterSchema"
      :loading="authStore.loginLoading"
      title="商家注册"
      sub-title="创建商家账号"
      submit-button-text="注册并登录"
      @submit="handleMerchantRegister"
    />
    <template v-else>
      <AuthenticationLogin
        ref="loginRef"
        :form-schema="formSchema"
        :loading="authStore.loginLoading"
        :show-code-login="!isMerchantMode"
        :show-forget-password="!isMerchantMode"
        :show-qrcode-login="!isMerchantMode"
        :show-register="false"
        :title="isMerchantMode ? '商家登录' : undefined"
        @submit="handleLogin"
      />
      <div v-if="isMerchantMode" class="mt-4 text-center text-sm">
        还没有商家账号？
        <AButton type="link" class="p-0" @click="isRegister = true">
          立即注册
        </AButton>
      </div>
    </template>
    <Verification
      ref="verifyRef"
      v-if="captchaEnable && !isMerchantMode && !isRegister"
      :captcha-type="captchaType"
      :check-captcha-api="checkCaptcha"
      :get-captcha-api="getCaptcha"
      :img-size="{ width: '400px', height: '200px' }"
      mode="pop"
      @on-success="handleVerifySuccess"
    />
  </div>
</template>
