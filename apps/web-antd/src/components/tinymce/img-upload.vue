<script lang="ts" setup>
import type { UploadRequestOption } from 'ant-design-vue/lib/vc-upload/interface';

import { computed, ref } from 'vue';

import { $t } from '@vben/locales';
import { buildShortUUID } from '@vben/utils';

import { Button, Upload } from 'ant-design-vue';

import { useUpload } from '#/components/upload/use-upload';

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
});

const emit = defineEmits(['uploading', 'uploadingChange', 'done', 'error']);

const uploadingCount = ref(0);

const getButtonProps = computed(() => {
  const { disabled } = props;
  return {
    disabled,
  };
});

async function customRequest(info: UploadRequestOption<any>) {
  const file = info.file as File;
  const uploadId = buildShortUUID('tinymce-upload');
  uploadingCount.value += 1;
  emit('uploading', uploadId);
  if (uploadingCount.value === 1) {
    emit('uploadingChange', true);
  }

  const { httpRequest } = useUpload();
  try {
    const url = await httpRequest(file);
    emit('done', uploadId, url);
  } catch {
    emit('error', uploadId);
  } finally {
    uploadingCount.value = Math.max(0, uploadingCount.value - 1);
    if (uploadingCount.value === 0) {
      emit('uploadingChange', false);
    }
  }
}
</script>
<template>
  <div :class="[{ fullscreen }]" class="tinymce-image-upload">
    <Upload
      :show-upload-list="false"
      accept=".jpg,.jpeg,.gif,.png,.webp"
      multiple
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
