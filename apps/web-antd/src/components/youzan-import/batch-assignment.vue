<script setup lang="ts">
import { onMounted, ref, useId } from 'vue';

import { Alert, Button, Select } from 'ant-design-vue';

const props = defineProps<{
  busy: boolean;
  loadOptions: () => Promise<{ label: string; value: string }[]>;
  scopeLabel: string;
}>();
const emit = defineEmits<{ assign: [value: string] }>();

const fieldId = useId();
const selected = ref<string>();
const options = ref<{ label: string; value: string }[]>([]);
const loading = ref(true);
const failed = ref(false);

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    options.value = await props.loadOptions();
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

function assign() {
  if (selected.value && !props.busy) emit('assign', selected.value);
}

onMounted(load);
</script>

<template>
  <div>
    <Alert
      v-if="failed"
      type="error"
      :message="`${scopeLabel}列表加载失败`"
      show-icon
    >
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Alert
      v-else-if="!loading && !options.length"
      type="info"
      :message="`当前账号没有可分配的${scopeLabel}，请联系管理员授权。`"
      show-icon
    />
    <div v-else class="flex flex-wrap items-center gap-3">
      <label :for="fieldId">{{ scopeLabel }}</label>
      <Select
        :id="fieldId"
        v-model:value="selected"
        class="w-64 max-w-full"
        :disabled="busy || loading"
        :loading="loading"
        :options="options"
        :placeholder="`请选择${scopeLabel}`"
        option-filter-prop="label"
        show-search
      />
      <Button
        type="primary"
        :disabled="!selected || busy"
        :loading="busy"
        @click="assign"
      >
        确认分配
      </Button>
    </div>
  </div>
</template>
