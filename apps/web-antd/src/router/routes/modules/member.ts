import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/member/youzan-import',
    component: () => import('#/views/member/youzan-import/index.vue'),
    name: 'MemberYouzanImport',
    meta: {
      title: '有赞客户积分导入',
      icon: 'lucide:cloud-upload',
    },
  },
  {
    path: '/member/user/detail',
    component: () => import('#/views/member/user/detail/index.vue'),
    name: 'MemberUserDetail',
    meta: {
      title: '会员详情',
      icon: 'lucide:user',
      activePath: '/member/user',
      hideInMenu: true,
    },
  },
];

export default routes;
