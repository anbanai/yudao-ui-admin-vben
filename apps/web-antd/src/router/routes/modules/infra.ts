import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/infra/share-cover',
    component: () => import('#/views/infra/share-cover/index.vue'),
    name: 'InfraShareCover',
    meta: {
      title: '小程序分享封面',
      icon: 'lucide:image',
      activePath: '/infra/share-cover',
      keepAlive: true,
    },
  },
  {
    path: '/infra/job/log',
    component: () => import('#/views/infra/job/logger/index.vue'),
    name: 'InfraJobLog',
    meta: {
      title: '调度日志',
      icon: 'ant-design:history-outlined',
      activePath: '/infra/job',
      keepAlive: false,
      hideInMenu: true,
    },
  },
  {
    path: '/infra/codegen/edit',
    component: () => import('#/views/infra/codegen/edit/index.vue'),
    name: 'InfraCodegenEdit',
    meta: {
      title: '生成配置修改',
      icon: 'ic:baseline-view-in-ar',
      activePath: '/infra/codegen',
      keepAlive: true,
      hideInMenu: true,
    },
  },
];

export default routes;
