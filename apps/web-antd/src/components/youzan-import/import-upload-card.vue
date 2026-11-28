<script setup lang="ts">
import { onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Select,
  Upload,
} from 'ant-design-vue';

const props = defineProps<{
  busy: boolean;
  file?: File;
  loadOptions: () => Promise<{ label: string; value: string }[]>;
}>();

const emit = defineEmits<{
  file: [file?: File];
  preview: [];
}>();
const merchant = defineModel<string>('merchant', { required: true });
const options = ref<{ label: string; value: string }[]>([]);
const loading = ref(true);
const failed = ref(false);
const invalidFile = ref(false);

async function loadMerchants() {
  loading.value = true;
  failed.value = false;
  try {
    options.value = await props.loadOptions();
    if (options.value.length === 1 && !merchant.value) {
      merchant.value = options.value[0]!.value;
    }
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

function selectFile(file: File) {
  invalidFile.value =
    !file.name.toLowerCase().endsWith('.xlsx') ||
    file.size > 4_000_000 ||
    file.size === 0;
  emit('file', invalidFile.value ? undefined : file);
  return false;
}

onMounted(loadMerchants);
</script>

<template>
  <Card title="上传 Excel" class="max-w-4xl">
    <Form layout="vertical">
      <FormItem label="导入商家" html-for="youzan-merchant" required>
        <Select
          id="youzan-merchant"
          v-model:value="merchant"
          class="max-w-md"
          :disabled="busy || !options.length"
          :loading="loading"
          :options="options"
          option-filter-prop="label"
          placeholder="请选择已授权的商家"
          show-search
        />
      </FormItem>
      <Alert
        v-if="failed"
        class="mb-4"
        type="error"
        message="商家列表加载失败"
        show-icon
      >
        <template #action>
          <Button size="small" :loading="loading" @click="loadMerchants">
            重试
          </Button>
        </template>
      </Alert>
      <Alert
        v-else-if="!loading && !options.length"
        class="mb-4"
        type="info"
        message="当前账号没有可导入的商家，请联系管理员授权。"
        show-icon
      />

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
        :disabled="!merchant || !file || invalidFile || loading"
        :loading="busy"
        @click="emit('preview')"
      >
        上传并预览
      </Button>
    </Form>
  </Card>
</template>
