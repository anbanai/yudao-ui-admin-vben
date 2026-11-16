<script setup lang="ts">
import type { UserWalletProperty } from './config';

import { Image } from 'ant-design-vue';

import { MALL_DIY_ASSETS } from '../../../static-assets';

/** 用户资产 */
defineOptions({ name: 'UserWallet' });

/** 定义属性 */
defineProps<{ property: UserWalletProperty }>();
</script>
<template>
  <Image :src="MALL_DIY_ASSETS.userWallet" :preview="false" />
</template>
