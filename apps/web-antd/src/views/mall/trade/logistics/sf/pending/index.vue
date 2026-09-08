<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
  router.replace({ path: '/mall/trade/order' });
});
</script>

<template>
  <div></div>
</template>
