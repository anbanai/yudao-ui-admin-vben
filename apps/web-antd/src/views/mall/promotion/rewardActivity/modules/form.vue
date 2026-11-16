<script lang="ts" setup>
import type { MallRewardActivityApi } from '#/api/mall/promotion/reward/rewardActivity';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import {
  PromotionConditionTypeEnum,
  PromotionProductScopeEnum,
} from '@vben/constants';
import { cloneDeep, convertToInteger, formatToFraction } from '@vben/utils';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createRewardActivity,
  getReward,
  updateRewardActivity,
} from '#/api/mall/promotion/reward/rewardActivity';
import { $t } from '#/locales';
import { ProductCategorySelect } from '#/views/mall/product/category/components';
import { SpuShowcase } from '#/views/mall/product/spu/components';

import {
  expandProductScopeValues,
  getProductScopeValues,
  useFormSchema,
} from '../data';
import RewardRule from './reward-rule.vue';

const emit = defineEmits(['success']);

type RewardActivityFormValues = Omit<
  Partial<MallRewardActivityApi.RewardActivity>,
  'endTime' | 'productCategoryIds' | 'startAndEndTime' | 'startTime'
> & {
  endTime?: Date | string;
  productCategoryIds?: number | number[];
  startAndEndTime?: Array<string | undefined>;
  startTime?: Date | string;
};

const createDefaultFormData = (): RewardActivityFormValues => ({
  conditionType: PromotionConditionTypeEnum.PRICE.type,
  productScope: PromotionProductScopeEnum.ALL.scope,
  productScopeValues: [],
  productCategoryIds: [],
  productSpuIds: [],
  rules: [],
});

const editingId = ref<number>();
const getTitle = computed(() => {
  return editingId.value
    ? $t('ui.actionTitle.edit', ['满减送'])
    : $t('ui.actionTitle.create', ['满减送']);
});

const [Form, formApi] = useVbenForm<RewardActivityFormValues>({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 100,
  },
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    // 提交表单
    try {
      const values = await formApi.getValues();
      const data = {
        ...values,
        id: editingId.value,
        productScopeValues: getProductScopeValues(values),
      };
      if (data.startAndEndTime && Array.isArray(data.startAndEndTime)) {
        data.startTime = data.startAndEndTime[0];
        data.endTime = data.startAndEndTime[1];
        delete data.startAndEndTime;
      }
      // 深拷贝 rules 避免修改原始数据
      const rules = cloneDeep(
        data.rules,
      ) as unknown as MallRewardActivityApi.RewardRule[];
      rules.forEach((item: any) => {
        item.discountPrice = convertToInteger(item.discountPrice || 0);
        if (data.conditionType === PromotionConditionTypeEnum.PRICE.type) {
          item.limit = convertToInteger(item.limit || 0);
        }
      });
      data.rules = rules;
      await (data.id
        ? updateRewardActivity(data as MallRewardActivityApi.RewardActivity)
        : createRewardActivity(data as MallRewardActivityApi.RewardActivity));
      // 关闭并提示
      await modalApi.close();
      emit('success');
      message.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      editingId.value = undefined;
      await formApi.reset({ values: createDefaultFormData() });
      return;
    }
    // 加载数据
    const data = modalApi.getData() as MallRewardActivityApi.RewardActivity;
    if (!data || !data.id) {
      editingId.value = undefined;
      await formApi.reset({ values: createDefaultFormData() });
      return;
    }
    modalApi.lock();
    try {
      const result = {
        ...createDefaultFormData(),
        ...(await getReward(data.id)),
      } as RewardActivityFormValues;
      result.startAndEndTime = [
        result.startTime ? String(result.startTime) : undefined,
        result.endTime ? String(result.endTime) : undefined,
      ] as any[];
      result.rules?.forEach((item: any) => {
        item.discountPrice = formatToFraction(item.discountPrice || 0);
        if (result.conditionType === PromotionConditionTypeEnum.PRICE.type) {
          item.limit = formatToFraction(item.limit || 0);
        }
      });
      editingId.value = result.id;
      // 设置到 values
      await formApi.setValues(expandProductScopeValues(result));
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-2/3">
    <Form class="mx-6">
      <!-- 自定义插槽：优惠规则 -->
      <template #rules="slotProps">
        <RewardRule
          v-bind="slotProps.componentField"
          :condition-type="slotProps.values.conditionType"
        />
      </template>
      <!-- 自定义插槽：商品选择 -->
      <template #productSpuIds="slotProps">
        <SpuShowcase v-bind="slotProps.componentField" />
      </template>
      <!-- 自定义插槽：分类选择 -->
      <template #productCategoryIds="slotProps">
        <ProductCategorySelect v-bind="slotProps.componentField" multiple />
      </template>
    </Form>
  </Modal>
</template>
