<script lang="ts" setup>
import type { MallRewardActivityApi } from '#/api/mall/promotion/reward/rewardActivity';

import { computed } from 'vue';

import { PromotionConditionTypeEnum } from '@vben/constants';

import {
  Button,
  Card,
  Col,
  Form,
  FormItem,
  Input,
  InputNumber,
  Row,
  Switch,
  Tag,
} from 'ant-design-vue';

import RewardRuleCouponSelect from './reward-rule-coupon-select.vue';
import {
  appendRewardRule,
  patchRewardRule,
  removeRewardRule,
  replaceRewardRule,
} from './reward-rule-utils';

defineOptions({ name: 'RewardRule' });

const props = defineProps<{
  conditionType?: number;
  modelValue?: MallRewardActivityApi.RewardRule[];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', v: MallRewardActivityApi.RewardRule[]): void;
}>();

const formData = computed({
  get: () => props.modelValue ?? [],
  set: (value: MallRewardActivityApi.RewardRule[]) => {
    emits('update:modelValue', value);
  },
});

const isPriceCondition = computed(() => {
  return props.conditionType === PromotionConditionTypeEnum.PRICE.type;
});

/** 处理新增 */
function handleAdd() {
  formData.value = appendRewardRule(formData.value);
}

/** 处理删除 */
function handleDelete(ruleIndex: number) {
  formData.value = removeRewardRule(formData.value, ruleIndex);
}

function handlePatchRule(
  ruleIndex: number,
  key: keyof MallRewardActivityApi.RewardRule,
  value: unknown,
) {
  formData.value = patchRewardRule(formData.value, ruleIndex, key, value);
}

function handleReplaceRule(
  ruleIndex: number,
  rule: MallRewardActivityApi.RewardRule,
) {
  formData.value = replaceRewardRule(formData.value, ruleIndex, rule);
}
</script>

<template>
  <Row :gutter="[16, 16]">
    <template v-if="formData">
      <Col v-for="(rule, index) in formData" :key="index" :span="24">
        <Card size="small" class="rounded-lg">
          <!-- 规则标题 -->
          <template #title>
            <div class="flex items-center">
              <span class="text-base font-medium">
                活动层级 {{ index + 1 }}
              </span>
            </div>
          </template>
          <template v-if="index !== 0" #extra>
            <Button
              type="link"
              danger
              size="small"
              @click="handleDelete(index)"
            >
              删除
            </Button>
          </template>

          <Form :model="rule" layout="horizontal">
            <!-- 优惠门槛 -->
            <FormItem label="优惠门槛:" :colon="false" class="mb-3">
              <div
                class="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
              >
                <span>满</span>
                <InputNumber
                  v-if="isPriceCondition"
                  :value="rule.limit"
                  @update:value="handlePatchRule(index, 'limit', $event)"
                  :min="0"
                  :precision="2"
                  :step="0.1"
                  class="!w-40"
                  placeholder="请输入金额"
                />
                <Input
                  v-else
                  :value="rule.limit"
                  @update:value="handlePatchRule(index, 'limit', $event)"
                  :min="0"
                  class="!w-40"
                  placeholder="请输入数量"
                  type="number"
                />
                <span>{{ isPriceCondition ? '元' : '件' }}</span>
              </div>
            </FormItem>
            <!-- 优惠内容 -->
            <FormItem label="优惠内容:" :colon="false" class="!mb-0">
              <div class="flex flex-col gap-3">
                <!-- 订单金额优惠 -->
                <div
                  class="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
                >
                  <span class="!w-21 shrink-0 text-sm text-muted-foreground">
                    订单金额优惠
                  </span>
                  <span>减</span>
                  <InputNumber
                    :value="rule.discountPrice"
                    @update:value="
                      handlePatchRule(index, 'discountPrice', $event)
                    "
                    :min="0"
                    :precision="2"
                    :step="0.1"
                    class="!w-32"
                    placeholder="请输入金额"
                  />
                  <span>元</span>
                </div>
                <!-- 包邮 -->
                <div
                  class="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
                >
                  <span class="w-20 shrink-0 text-sm text-muted-foreground">
                    包邮
                  </span>
                  <Switch
                    :checked="rule.freeDelivery"
                    @update:checked="
                      handlePatchRule(index, 'freeDelivery', $event)
                    "
                    checked-children="是"
                    un-checked-children="否"
                  />
                </div>
                <!-- 送积分 -->
                <div
                  class="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
                >
                  <span class="w-20 shrink-0 text-sm text-muted-foreground">
                    送积分
                  </span>
                  <span>送</span>
                  <InputNumber
                    :value="rule.point"
                    @update:value="handlePatchRule(index, 'point', $event)"
                    :min="0"
                    class="!w-32"
                    placeholder="请输入积分"
                  />
                  <span>积分</span>
                </div>
                <!-- 送优惠券 -->
                <div
                  class="flex flex-col items-start gap-2 rounded-md bg-muted px-3 py-2"
                >
                  <span class="w-20 shrink-0 text-sm text-muted-foreground">
                    送优惠券
                  </span>
                  <RewardRuleCouponSelect
                    :model-value="rule"
                    @update:model-value="handleReplaceRule(index, $event)"
                  />
                </div>
              </div>
            </FormItem>
          </Form>
        </Card>
      </Col>
    </template>

    <!-- 添加规则按钮 -->
    <Col :span="24" class="mt-2">
      <Button type="primary" @click="handleAdd">+ 添加优惠规则</Button>
    </Col>

    <!-- 提示信息 -->
    <Col :span="24" class="mt-2">
      <Tag color="warning">
        提示：赠送积分为 0 时不赠送；未选择优惠券时不赠送。
      </Tag>
    </Col>
  </Row>
</template>
