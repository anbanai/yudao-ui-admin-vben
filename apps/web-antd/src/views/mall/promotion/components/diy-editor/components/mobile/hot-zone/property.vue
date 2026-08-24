<script setup lang="ts">
import type { HotZoneProperty } from './config';

import type { AppLink } from '#/views/mall/promotion/components/app-link-input/data';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useVModel } from '@vueuse/core';
import {
  Button,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Tooltip,
} from 'ant-design-vue';

import UploadImg from '#/components/upload/image-upload.vue';
import { AppLinkSelectDialog } from '#/views/mall/promotion/components';

import ComponentContainerProperty from '../../component-container-property.vue';
import {
  HOT_ZONE_MIN_SIZE,
  HOT_ZONE_SCALE_RATE,
} from './components/hot-zone-edit-dialog/controller';
import HotZoneEditDialog from './components/hot-zone-edit-dialog/index.vue';

/** 热区属性面板 */
defineOptions({ name: 'HotZoneProperty' });

const props = defineProps<{ modelValue: HotZoneProperty }>();

const emit = defineEmits(['update:modelValue']);

const formData = useVModel(props, 'modelValue', emit);
const hotZoneMobileMinSize = HOT_ZONE_MIN_SIZE / HOT_ZONE_SCALE_RATE;

const editDialogRef = ref(); // 热区编辑对话框
const appLinkDialogRef = ref(); // 链接选择对话框
const activeHotZoneIndex = ref<number>();

/** 打开热区编辑对话框 */
function handleOpenEditDialog() {
  editDialogRef.value.open();
}

/** 新增一个手机画布尺寸的热区。 */
function handleAdd() {
  formData.value.list.push({
    name: '',
    url: '',
    width: hotZoneMobileMinSize,
    height: hotZoneMobileMinSize,
    top: 0,
    left: 0,
  });
}

function handleRemove(index: number) {
  formData.value.list.splice(index, 1);
}

function handleSelectLink(index: number) {
  activeHotZoneIndex.value = index;
  const hotZone = formData.value.list[index];
  appLinkDialogRef.value?.open(hotZone?.url || '', hotZone?.name);
}

function handleAppLinkChange(appLink: AppLink) {
  const index = activeHotZoneIndex.value;
  if (index === undefined || !formData.value.list[index]) {
    return;
  }
  formData.value.list[index].name = appLink.name;
  formData.value.list[index].url = appLink.path;
}
</script>

<template>
  <ComponentContainerProperty v-model="formData.style">
    <!-- 表单 -->
    <Form
      :label-col="{ style: { width: '80px' } }"
      :model="formData"
      class="mt-2"
    >
      <FormItem label="上传图片" name="imgUrl">
        <UploadImg
          v-model="formData.imgUrl"
          height="50px"
          width="auto"
          class="min-w-[80px]"
          :show-description="false"
        >
          <!-- TODO @芋艿：这里不提示；是不是组件得封装下；-->
          <template #tip> 推荐宽度 750 </template>
        </UploadImg>
      </FormItem>

      <div class="mb-2 flex items-center justify-between">
        <span class="font-medium">热区列表</span>
        <Tooltip title="新增热区">
          <Button type="primary" size="small" @click="handleAdd">
            <IconifyIcon icon="lucide:plus" />
          </Button>
        </Tooltip>
      </div>

      <Empty
        v-if="formData.list.length === 0"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        description="暂无热区"
      />

      <div
        v-for="(item, index) in formData.list"
        :key="index"
        class="mb-3 border border-solid border-gray-200 p-3"
      >
        <div class="mb-2 flex items-center gap-2">
          <span class="shrink-0 text-xs text-gray-500">热区 {{ index + 1 }}</span>
          <Input
            v-model:value="item.name"
            size="small"
            placeholder="选择链接后自动回填名称"
          />
          <Tooltip title="删除热区">
            <Button danger size="small" @click="handleRemove(index)">
              <IconifyIcon icon="lucide:trash-2" />
            </Button>
          </Tooltip>
        </div>

        <div class="mb-2 break-all text-xs text-gray-500">
          {{ item.url || '尚未选择链接' }}
        </div>

        <div class="mb-2 grid grid-cols-2 gap-2">
          <InputNumber
            v-model:value="item.left"
            :min="0"
            size="small"
            class="w-full"
            addon-before="X"
          />
          <InputNumber
            v-model:value="item.top"
            :min="0"
            size="small"
            class="w-full"
            addon-before="Y"
          />
          <InputNumber
            v-model:value="item.width"
            :min="hotZoneMobileMinSize"
            size="small"
            class="w-full"
            addon-before="宽"
          />
          <InputNumber
            v-model:value="item.height"
            :min="hotZoneMobileMinSize"
            size="small"
            class="w-full"
            addon-before="高"
          />
        </div>

        <Button block size="small" @click="handleSelectLink(index)">
          <IconifyIcon icon="lucide:link" class="mr-1" />
          选择链接
        </Button>
      </div>
    </Form>

    <Button type="primary" ghost class="w-full" @click="handleOpenEditDialog">
      <IconifyIcon icon="lucide:move" class="mr-1" />
      调整热区位置
    </Button>
  </ComponentContainerProperty>

  <!-- 热区编辑对话框 -->
  <HotZoneEditDialog
    ref="editDialogRef"
    v-model="formData.list"
    :img-url="formData.imgUrl"
  />

  <AppLinkSelectDialog
    ref="appLinkDialogRef"
    @app-link-change="handleAppLinkChange"
  />
</template>
