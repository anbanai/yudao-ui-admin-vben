import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/pay/fund',
    component: () => import('#/views/pay/fund/index.vue'),
    name: 'PayFund',
    meta: {
      title: '资金运营',
      icon: 'lucide:landmark',
      authority: ['pay:fund:query'],
    },
  },
  {
    path: '/pay/fund/merchant',
    component: () => import('#/views/pay/fund/merchant.vue'),
    name: 'PayFundMerchant',
    meta: {
      title: '商户支付入网',
      icon: 'lucide:building-2',
      authority: ['pay:fund:merchant:query'],
    },
  },
  {
    path: '/pay/cashier',
    component: () => import('#/views/pay/cashier/index.vue'),
    name: 'PayCashier',
    meta: {
      title: '收银台',
      icon: 'lucide:badge-japanese-yen',
      hideInMenu: true,
    },
  },
];

export default routes;
