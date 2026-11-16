<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import ApplicationReview from './modules/application-review.vue';
import BusinessTypeConfig from './modules/business-type-config.vue';
</script>

<template>
  <Page auto-content-height>
    <a-tabs class="h-full" destroy-inactive-tab-pane>
      <a-tab-pane key="applications" tab="入驻审核">
        <ApplicationReview />
      </a-tab-pane>
      <a-tab-pane key="business-types" tab="经营类型配置">
        <BusinessTypeConfig />
      </a-tab-pane>
    </a-tabs>
  </Page>
</template>
