<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Button, Form, FormItem, Input, message } from 'ant-design-vue';

import UploadImg from '#/components/upload/image-upload.vue';
import {
  getShareCoverConfig,
  saveShareCoverConfig,
} from '#/api/infra/share-cover';

const saving = ref(false);
const customPagePath = ref('');
const customPageCover = ref('');
const form = reactive({ default: '', home: '', user: '', pages: {} as Record<string, string> });
const pageRows = ref<{ path: string; cover: string }[]>([]);

function syncRows() {
  pageRows.value = Object.entries(form.pages).map(([path, cover]) => ({ path, cover }));
}

function parseConfig(value?: string) {
  try {
    const parsed = value ? JSON.parse(value) : {};
    form.default = parsed.default || '';
    form.home = parsed.home || '';
    form.user = parsed.user || '';
    form.pages = parsed.pages || {};
    syncRows();
  } catch {
    message.error('分享封面配置格式异常，已使用空配置');
  }
}

async function load() {
  const result = await getShareCoverConfig();
  parseConfig(JSON.stringify(result));
}

function addPage() {
  const path = customPagePath.value.trim();
  const cover = customPageCover.value.trim();
  if (!path || !cover) {
    message.warning('请填写自定义页面标识并上传封面');
    return;
  }
  form.pages[path] = cover;
  syncRows();
  customPagePath.value = '';
  customPageCover.value = '';
}

function removePage(path: string) {
  delete form.pages[path];
  syncRows();
}

async function save() {
  saving.value = true;
  try {
    form.pages = Object.fromEntries(
      pageRows.value
        .map((row) => [row.path.trim(), row.cover.trim()] as const)
        .filter(([path, cover]) => path && cover),
    );
    await saveShareCoverConfig({
      default: form.default,
      home: form.home,
      user: form.user,
      pages: form.pages,
    });
    message.success('分享封面已保存，重新进入小程序后生效');
    await load();
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page title="小程序分享封面" auto-content-height>
    <Form layout="vertical" class="mx-auto max-w-4xl rounded bg-background p-6">
      <p class="mb-5 text-sm text-muted-foreground">
        未单独配置的页面使用系统默认封面。上传或替换图片后保存，重新进入小程序即可验证分享卡片效果。
      </p>
      <FormItem label="系统默认封面">
        <UploadImg v-model="form.default" :limit="1" :show-description="false" />
      </FormItem>
      <FormItem label="首页分享封面">
        <UploadImg v-model="form.home" :limit="1" :show-description="false" />
      </FormItem>
      <FormItem label="个人中心分享封面">
        <UploadImg v-model="form.user" :limit="1" :show-description="false" />
      </FormItem>
      <FormItem label="自定义页面封面">
        <div v-for="row in pageRows" :key="row.path" class="mb-3 flex items-center gap-3">
          <Input v-model:value="row.path" class="w-64" />
          <UploadImg v-model="row.cover" :limit="1" :show-description="false" />
          <Button danger @click="removePage(row.path)">移除</Button>
        </div>
        <div class="flex items-center gap-3">
          <Input v-model:value="customPagePath" class="w-64" placeholder="如 page:123" />
          <UploadImg v-model="customPageCover" :limit="1" :show-description="false" />
          <Button @click="addPage">添加页面</Button>
        </div>
      </FormItem>
      <Button type="primary" :loading="saving" @click="save">保存配置</Button>
    </Form>
  </Page>
</template>
