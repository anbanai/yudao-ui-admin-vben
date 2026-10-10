<script lang="ts" setup>
import { computed, ref } from 'vue';

import { $t } from '@vben/locales';

import { Button, message, Upload } from 'antdv-next';

import {
  getMaterialImageValidationError,
  getProductImageValidationError,
} from '#/components/upload/policy';
import { useUpload } from '#/components/upload/use-upload';

type UploadRequestOption = any;

defineOptions({ name: 'TinymceImageUpload' });

const props = defineProps({
  disabled: {
    default: false,
    type: Boolean,
  },
  fullscreen: {
    default: false,
    type: Boolean,
  }, // 图片上传，是否放到全屏的位置
  scene: {
    default: undefined,
    type: String,
  },
});

const emit = defineEmits(['uploading', 'done', 'error']);

const uploading = ref(false);

const getButtonProps = computed(() => {
  const { disabled } = props;
  return {
    disabled,
  };
});

async function customRequest(info: UploadRequestOption) {
  // 1. emit 上传中
  const file = info.file as File;
  const name = file?.name;
  if (!uploading.value) {
    emit('uploading', name);
    uploading.value = true;
  }

  // 2. 执行上传
  const { httpRequest } = useUpload(
    undefined,
    props.scene as 'material' | 'product' | undefined,
  );
  try {
    const url = await httpRequest(file);
    emit('done', name, url);
  } catch {
    emit('error', name);
  } finally {
    uploading.value = false;
  }
}

function beforeUpload(file: File) {
  let error: null | string = null;
  if (props.scene === 'product') {
    error = getProductImageValidationError(file.name, file.size);
  } else if (props.scene === 'material') {
    error = getMaterialImageValidationError(file.name, file.size);
  }
  if (error) {
    message.error(error);
    return Upload.LIST_IGNORE;
  }
  return true;
}

function getAccept(scene?: string) {
  if (scene === 'product') return '.jpg,.jpeg,.png,.bmp';
  if (scene === 'material') return '.gif,.jpg,.jpeg,.png,.bmp';
  return '.jpg,.jpeg,.gif,.png,.webp';
}
</script>
<template>
  <div :class="[{ fullscreen }]" class="tinymce-image-upload">
    <Upload
      :show-upload-list="false"
      :accept="getAccept(scene)"
      multiple
      :before-upload="beforeUpload"
      :custom-request="customRequest"
    >
      <Button type="primary" v-bind="{ ...getButtonProps }">
        {{ $t('ui.upload.imgUpload') }}
      </Button>
    </Upload>
  </div>
</template>

<style lang="scss" scoped>
.tinymce-image-upload {
  position: absolute;
  top: 4px;
  right: 10px;
  z-index: 20;

  &.fullscreen {
    position: fixed;
    z-index: 10000;
  }
}
</style>
