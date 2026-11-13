<script setup lang="ts">
import type { MallCouponApi } from '#/api/mall/promotion/coupon/coupon';

import { computed } from 'vue';

import { Alert, Button } from 'ant-design-vue';

import { readBatchSnapshot } from './send-session';
const props = defineProps<{
  batch: MallCouponApi.SendBatch;
  busy: boolean;
  uncertain: boolean;
}>();
defineEmits<{ cancel: []; confirm: []; recover: [] }>();
const snapshot = computed(() => readBatchSnapshot(props.batch));
const blocked = computed(
  () =>
    props.batch.failureCount > 0 ||
    props.batch.totalCount < 1 ||
    props.batch.status !== 0,
);
</script>
<template>
  <section class="space-y-3 rounded border p-4" aria-label="发券二次确认">
    <h3 class="text-lg font-bold">
      {{ batch.status === 1 ? '发券结果' : '确认发放优惠券' }}
    </h3>
    <Alert
      v-if="uncertain"
      type="warning"
      message="提交结果待确认，请查询或按同一批次重试。不要新建批次。"
    />
    <Alert
      v-else-if="batch.status === 1"
      type="success"
      :message="`已发放 ${batch.successCount} 人；重复查询不会再次发券`"
    />
    <p>批次号：{{ batch.id }}；操作人：{{ batch.operatorId }}</p>
    <p>模板：{{ snapshot.template.name }}（{{ batch.templateId }}）</p>
    <p>
      目标账号 {{ batch.totalCount }} 人；已成功
      {{ batch.successCount }}；预检失败项 {{ batch.failureCount }}
    </p>
    <p v-if="snapshot.template.validityType === 1">
      有效期：{{ snapshot.template.validStartTime }} 至
      {{ snapshot.template.validEndTime }}
    </p>
    <p v-else>
      领取后第 {{ snapshot.template.fixedStartTerm }} 天至第
      {{ snapshot.template.fixedEndTerm }} 天有效
    </p>
    <p>
      每人限领
      {{
        snapshot.template.takeLimitCount === -1
          ? '不限'
          : snapshot.template.takeLimitCount
      }}
      张；发行总量
      {{
        snapshot.template.totalCount === -1
          ? '不限'
          : snapshot.template.totalCount
      }}
    </p>
    <p
      v-if="
        snapshot.template.couponType !== 2 &&
        snapshot.template.discountType === 1
      "
    >
      优惠面额：{{ (snapshot.template.discountPrice / 100).toFixed(2) }} 元
    </p>
    <p v-else-if="snapshot.template.couponType !== 2">
      优惠折扣：{{
        (snapshot.template.discountPercent ?? 0) / 10
      }}
      折；优惠上限：{{
        snapshot.template.discountLimitPrice
          ? `${(snapshot.template.discountLimitPrice / 100).toFixed(2)} 元`
          : '不限'
      }}
    </p>
    <p>
      适用范围：{{
        snapshot.template.productScope === 1
          ? '全部商品'
          : snapshot.template.productScope === 2
            ? '指定商品SPU'
            : '指定商品分类'
      }}
      {{ snapshot.template.productScopeValues?.join('，') }}
    </p>
    <p v-if="snapshot.template.newcomerOnly">
      新人专享，领取资格以后台校验为准。
    </p>
    <p>
      使用门槛 {{ (snapshot.template.usePrice / 100).toFixed(2) }} 元；{{
        snapshot.template.couponType === 2 ? '商品兑换券' : '优惠券'
      }}；{{
        snapshot.template.canStack
          ? `最多叠加 ${snapshot.template.stackLimit} 张`
          : '不可叠加优惠券'
      }}；{{
        snapshot.template.stackWithPromotion
          ? '可与其他营销和积分抵扣同用'
          : '不可与其他营销和积分抵扣同用'
      }}
    </p>
    <p v-if="snapshot.template.couponType === 2">
      兑换商品 SPU {{ snapshot.template.exchangeSpuId }} / SKU
      {{ snapshot.template.exchangeSkuId }}；运费按订单结算
    </p>
    <details>
      <summary>查看实际目标账号快照（{{ snapshot.users.length }}）</summary>
      <p class="max-h-32 overflow-auto break-all">
        {{ snapshot.users.join('，') }}
      </p>
    </details>
    <details v-if="snapshot.mobiles">
      <summary>手机号快照</summary>
      <p class="max-h-32 overflow-auto break-all">{{ snapshot.mobiles }}</p>
    </details>
    <pre
      v-if="snapshot.failures"
      class="max-h-40 overflow-auto whitespace-pre-wrap text-red-600"
      >{{ snapshot.failures }}</pre>
    <Alert
      v-if="blocked && batch.status === 0"
      type="error"
      message="本批次不能提交，请取消确认，修正名单后重新预检。失败项数量不等于失败人数。"
    />
    <div class="flex gap-2">
      <Button
        data-testid="cancel"
        :disabled="busy || uncertain"
        @click="$emit('cancel')"
      >
        {{ batch.status === 1 ? '完成' : '取消确认' }}
      </Button>
      <Button
        v-if="batch.status === 0"
        data-testid="confirm"
        type="primary"
        :disabled="blocked"
        :loading="busy"
        @click="$emit('confirm')"
      >
        {{ uncertain ? '按此批次重试' : '确认发放' }}
      </Button>
      <Button
        v-access:code="['promotion:coupon:query']"
        :loading="busy"
        @click="$emit('recover')"
      >
        查询批次结果
      </Button>
    </div>
  </section>
</template>
