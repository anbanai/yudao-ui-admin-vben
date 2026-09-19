<script setup lang="ts">
import type { ProductListProperty } from './config';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useVModel } from '@vueuse/core';
import {
  Card,
  Checkbox,
  Form,
  FormItem,
  InputNumber,
  RadioButton,
  RadioGroup,
  Select,
  Slider,
  Switch,
  Tooltip,
} from 'ant-design-vue';

import UploadImg from '#/components/upload/image-upload.vue';
import SpuShowcase from '#/views/mall/product/spu/components/spu-showcase.vue';
import ColorInput from '#/views/mall/promotion/components/color-input/index.vue';

import ComponentContainerProperty from '../../component-container-property.vue';
import GroupSelect from '../product-group/group-select.vue';
import { clampProductGroupPageSize } from '../product-group/utils';

/** 商品栏属性面板 */
defineOptions({ name: 'ProductListProperty' });

const props = defineProps<{ modelValue: ProductListProperty }>();

const emit = defineEmits(['update:modelValue']);

const formData = useVModel(props, 'modelValue', emit);
const sourceType = computed({
  get: () => formData.value.sourceType || 'manual',
  set: (value: 'group' | 'manual') => {
    formData.value.sourceType = value;
  },
});

function updatePageSize(value: unknown) {
  formData.value.pageSize = clampProductGroupPageSize(
    typeof value === 'number' ? value : 10,
  );
}

function updateSortType(value: unknown) {
  if (
    value === 'default' ||
    value === 'latest' ||
    value === 'sales' ||
    value === 'priceAsc' ||
    value === 'priceDesc'
  ) {
    formData.value.sortType = value;
  }
}
</script>

<template>
  <ComponentContainerProperty v-model="formData.style">
    <Form
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
      :model="formData"
    >
      <Card title="商品列表" class="property-group" :bordered="false">
        <FormItem label="商品来源">
          <RadioGroup v-model:value="sourceType">
            <RadioButton value="manual">手动选择</RadioButton>
            <RadioButton value="group">按分组</RadioButton>
          </RadioGroup>
        </FormItem>
        <SpuShowcase v-if="sourceType === 'manual'" v-model="formData.spuIds" />
        <template v-else>
          <FormItem label="选择分组" required>
            <GroupSelect v-model="formData.groupIds" />
          </FormItem>
          <FormItem label="商品数量">
            <InputNumber
              :value="formData.pageSize ?? 10"
              :min="1"
              :max="50"
              :precision="0"
              @update:value="updatePageSize"
            />
          </FormItem>
          <FormItem label="商品排序">
            <Select
              :value="formData.sortType ?? 'default'"
              :options="[
                { label: '综合排序', value: 'default' },
                { label: '最新上架', value: 'latest' },
                { label: '销量优先', value: 'sales' },
                { label: '价格升序', value: 'priceAsc' },
                { label: '价格降序', value: 'priceDesc' },
              ]"
              @update:value="updateSortType"
            />
          </FormItem>
          <FormItem label="查看更多">
            <Switch v-model:checked="formData.showMore" />
          </FormItem>
        </template>
      </Card>
      <Card title="商品样式" class="property-group" :bordered="false">
        <FormItem label="布局" name="type">
          <RadioGroup v-model:value="formData.layoutType">
            <Tooltip title="双列" placement="bottom">
              <RadioButton value="twoCol">
                <IconifyIcon
                  icon="fluent:text-column-two-24-filled"
                  class="size-6"
                />
              </RadioButton>
            </Tooltip>
            <Tooltip title="三列" placement="bottom">
              <RadioButton value="threeCol">
                <IconifyIcon
                  icon="fluent:text-column-three-24-filled"
                  class="size-6"
                />
              </RadioButton>
            </Tooltip>
            <Tooltip title="水平滑动" placement="bottom">
              <RadioButton value="horizSwiper">
                <IconifyIcon icon="system-uicons:carousel" class="size-6" />
              </RadioButton>
            </Tooltip>
          </RadioGroup>
        </FormItem>
        <FormItem label="商品名称" name="fields.name.show">
          <div class="flex gap-2">
            <ColorInput v-model="formData.fields.name.color" />
            <Checkbox v-model:checked="formData.fields.name.show" />
          </div>
        </FormItem>
        <FormItem label="商品价格" name="fields.price.show">
          <div class="flex gap-2">
            <ColorInput v-model="formData.fields.price.color" />
            <Checkbox v-model:checked="formData.fields.price.show" />
          </div>
        </FormItem>
      </Card>
      <Card title="角标" class="property-group" :bordered="false">
        <FormItem label="角标" name="badge.show">
          <Switch v-model:checked="formData.badge.show" />
        </FormItem>
        <FormItem label="角标" name="badge.imgUrl" v-if="formData.badge.show">
          <UploadImg
            v-model="formData.badge.imgUrl"
            height="44px"
            width="72px"
            :show-description="false"
          >
            <!-- TODO @芋艿：这里不提示；是不是组件得封装下；-->
            <template #tip> 建议尺寸：36 * 22 </template>
          </UploadImg>
        </FormItem>
      </Card>
      <Card title="商品样式" class="property-group" :bordered="false">
        <FormItem label="上圆角" name="borderRadiusTop">
          <Slider
            v-model:value="formData.borderRadiusTop"
            :max="100"
            :min="0"
          />
        </FormItem>
        <FormItem label="下圆角" name="borderRadiusBottom">
          <Slider
            v-model:value="formData.borderRadiusBottom"
            :max="100"
            :min="0"
          />
        </FormItem>
        <FormItem label="间隔" name="space">
          <Slider v-model:value="formData.space" :max="100" :min="0" />
        </FormItem>
      </Card>
    </Form>
  </ComponentContainerProperty>
</template>
