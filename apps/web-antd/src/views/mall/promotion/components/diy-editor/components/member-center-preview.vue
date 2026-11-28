<script setup lang="ts">
import { IconifyIcon } from '@vben/icons';

import { MALL_DIY_ASSETS, mallStaticAsset } from '../static-assets';

const shortcuts = [
  ['waiting-payment', '待付款'],
  ['waiting-shipment', '待发货'],
  ['waiting-receipt', '待收货'],
  ['review', '待/已评价'],
  ['refund', '退款/售后'],
  ['group-buy', '我的团购'],
  ['footprints', '我的足迹'],
  ['points', '我的积分'],
  ['address', '收货地址'],
  ['profile', '个人信息'],
];
</script>

<template>
  <section aria-label="会员中心游客预览" class="member-preview">
    <header
      class="relative flex h-11 items-center justify-center bg-white text-base"
    >
      <IconifyIcon
        icon="lucide:house"
        class="absolute left-2 size-7 rounded-full border p-1"
      />
      会员中心
      <img
        alt=""
        :src="MALL_DIY_ASSETS.appNavBarMp"
        class="absolute right-1.5 h-[30px] w-[86px]"
      />
    </header>
    <div class="relative">
      <img
        alt="签到"
        :src="mallStaticAsset('member-center/profile-header.jpg')"
        class="block w-full"
      />
      <div class="profile">
        <img
          alt=""
          :src="mallStaticAsset('img/shop/default_avatar.png')"
          class="avatar"
        />
        <span>游客1782886...</span>
      </div>
    </div>
    <div class="relative">
      <img
        alt="注册会员 尊享权益，限时专属新人礼 | 新人专属积分 | 15项会员权益"
        :src="mallStaticAsset('member-center/member-promo.jpg')"
        class="block w-full"
      />
      <span class="register">去注册 <b>›</b></span>
    </div>
    <div class="orders">
      <div class="flex items-center justify-between">
        我的订单 <span class="text-xs text-neutral-400">全部 ›</span>
      </div>
      <div class="shortcuts">
        <div
          v-for="[icon, title] in shortcuts"
          :key="icon"
          class="flex flex-col items-center justify-center"
        >
          <img
            alt=""
            :src="mallStaticAsset(`member-center/icons/${ icon }.png`)"
          />
          {{ title }}
        </div>
      </div>
    </div>
    <div class="member-level">
      <div>
        <strong>好茶引力</strong>
        <div>登录查看会员等级</div>
      </div>
      <div class="member-points">
        可用积分 --
        <div>查看等级卡</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.member-preview {
  container-type: inline-size;
  line-height: 1.4;
  color: #171513;
}

.profile {
  position: absolute;
  top: 6.4cqw;
  left: 2.93cqw;
  display: flex;
  gap: 2.93cqw;
  align-items: center;
  font-size: 5.33cqw;
}

.avatar {
  width: 14.4cqw;
  height: 14.4cqw;
  border-radius: 50%;
}

.register {
  position: absolute;
  top: 43%;
  right: 9.87cqw;
  display: flex;
  gap: 1.33cqw;
  align-items: center;
  font-size: 3.2cqw;
  color: #765035;
  transform: translateY(-50%);
}

.register b {
  width: 3.33cqw;
  line-height: 3.33cqw;
  color: white;
  text-align: center;
  background: #765035;
  border-radius: 50%;
}

.orders {
  padding: 2.67cqw 3.73cqw 3.2cqw;
  margin: 0 2.67cqw;
  font-size: 3.73cqw;
  background: white;
  border-radius: 3.73cqw;
  box-shadow: 0 2px 6px rgb(63 48 29 / 9%);
}

.shortcuts {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  row-gap: 3.2cqw;
  margin-top: 2.13cqw;
  font-size: 3.2cqw;
  white-space: nowrap;
}

.shortcuts img {
  width: 9.87cqw;
  height: 9.87cqw;
  object-fit: contain;
}

.member-level {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4cqw;
  margin: 2.67cqw 2.67cqw 0;
  font-size: 3.2cqw;
  background: white;
  border-radius: 3.73cqw;
  box-shadow: 0 2px 6px rgb(63 48 29 / 9%);
}

.member-level strong {
  font-size: 4.8cqw;
}

.member-points {
  text-align: right;
}
</style>
