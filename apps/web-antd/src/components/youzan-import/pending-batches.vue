<script setup lang="ts">
import { ref } from 'vue';

import { Alert, Button, Empty, Modal, Spin } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    busy: boolean;
    loadPage: (before?: string) => Promise<string[]>;
    title?: string;
  }>(),
  { title: '待分配批次' },
);
const emit = defineEmits<{ select: [batchId: string] }>();

const open = ref(false);
const batches = ref<string[]>([]);
const more = ref(false);
const loading = ref(false);
const failed = ref(false);
let request = 0;

async function load() {
  const current = ++request;
  loading.value = true;
  failed.value = false;
  try {
    const page = await props.loadPage(batches.value.at(-1));
    if (current !== request) return;
    batches.value.push(...page);
    more.value = page.length === 20;
  } catch {
    if (current === request) failed.value = true;
  } finally {
    if (current === request) loading.value = false;
  }
}

function show() {
  batches.value = [];
  more.value = false;
  open.value = true;
  void load();
}

function close() {
  ++request;
  open.value = false;
}

function select(batchId: string) {
  if (props.busy) return;
  close();
  emit('select', batchId);
}
</script>

<template>
  <Button :disabled="busy" @click="show">{{ title }}</Button>
  <Modal :open="open" :title="title" :footer="null" @cancel="close">
    <ul
      v-if="batches.length"
      class="my-3 max-h-80 list-none overflow-y-auto p-0"
    >
      <li v-for="id in batches" :key="id">
        <Button type="link" :disabled="busy" @click="select(id)">
          批次 {{ id }}
        </Button>
      </li>
    </ul>
    <Empty v-else-if="!loading && !failed" :description="`暂无${title}`" />
    <Alert v-if="failed" type="error" :message="`${title}加载失败`" show-icon>
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Spin v-else-if="loading" aria-label="加载批次" />
    <Button v-else-if="more" @click="load">加载更多</Button>
  </Modal>
</template>
