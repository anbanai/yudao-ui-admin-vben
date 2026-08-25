<script setup lang="ts">
import type { UserOrderProperty } from './config';

import { Image } from 'ant-design-vue';

import { MALL_DIY_ASSETS } from '../../../static-assets';

/** 用户订单 */
defineOptions({ name: 'UserOrder' });

/** 定义属性 */
defineProps<{ property: UserOrderProperty }>();
</script>
<template>
  <Image :src="MALL_DIY_ASSETS.userOrder" :preview="false" />
</template>
