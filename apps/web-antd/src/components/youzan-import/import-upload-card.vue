<script setup lang="ts">
import { ref } from 'vue';

import { Button, Card, Form, FormItem, Upload } from 'ant-design-vue';

defineProps<{
  busy: boolean;
  file?: File;
}>();

const emit = defineEmits<{
  file: [file?: File];
  preview: [];
}>();
const invalidFile = ref(false);

function selectFile(file: File) {
  invalidFile.value =
    !file.name.toLowerCase().endsWith('.xlsx') ||
    file.size > 4_000_000 ||
    file.size === 0;
  emit('file', invalidFile.value ? undefined : file);
  return false;
}
</script>

<template>
  <Card title="上传 Excel" class="max-w-4xl">
    <Form layout="vertical">
      <FormItem
        label="Excel 文件"
        :help="
          invalidFile
            ? '请选择不超过 4 MB 的非空 .xlsx 文件'
            : '仅支持 .xlsx，最大 4 MB'
        "
        :validate-status="invalidFile ? 'error' : undefined"
      >
        <div class="flex flex-wrap items-center gap-3">
          <Upload
            accept=".xlsx"
            :before-upload="selectFile"
            :disabled="busy"
            :show-upload-list="false"
          >
            <Button :disabled="busy">
              {{ file ? '更换文件' : '选择文件' }}
            </Button>
          </Upload>
          <span v-if="file" class="break-all">{{ file.name }}</span>
        </div>
      </FormItem>
      <Button
        type="primary"
        :disabled="busy || !file || invalidFile"
        :loading="busy"
        @click="emit('preview')"
      >
        上传并预览
      </Button>
    </Form>
  </Card>
</template>
