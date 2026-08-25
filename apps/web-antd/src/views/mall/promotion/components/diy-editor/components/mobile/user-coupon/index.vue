<script setup lang="ts">
import type { UserCouponProperty } from './config';

import { Image } from 'ant-design-vue';

import { MALL_DIY_ASSETS } from '../../../static-assets';

/** 用户卡券 */
defineOptions({ name: 'UserCoupon' });
// 定义属性
defineProps<{ property: UserCouponProperty }>();
</script>
<template>
  <Image :src="MALL_DIY_ASSETS.userCoupon" :preview="false" />
</template>
