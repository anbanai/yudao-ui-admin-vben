import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/member/benefit',
    component: () => import('#/views/member/benefit/index.vue'),
    name: 'MemberBenefit',
    meta: {
      title: '会员权益配置',
      icon: 'lucide:gift',
      activePath: '/member/benefit',
      keepAlive: true,
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
