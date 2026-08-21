<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { nextTick, ref } from 'vue';

import { message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSpuPage } from '#/api/mall/product/spu';
import { getArticlePage } from '#/api/mall/promotion/article';
import { getCombinationActivityPage } from '#/api/mall/promotion/combination/combinationActivity';
import { getCouponTemplatePage } from '#/api/mall/promotion/coupon/couponTemplate';
import { getDiyPagePage } from '#/api/mall/promotion/diy/page';
import { getSeckillActivityPage } from '#/api/mall/promotion/seckill/seckillActivity';

import { APP_LINK_TYPE_ENUM } from './data';

/**
 * APP 链接详情通用单选表格
 *
 * 用于链接选择时，单选一个具体的记录（商品、活动、优惠券、文章、自定义页面等），
 * 选中后由父组件将记录编号拼接为链接参数。
 */
defineOptions({ name: 'AppLinkDetailSelect' });

const props = defineProps<{
  currentId?: number; // 当前链接已选中的记录编号（用于返显提示）
  type?: APP_LINK_TYPE_ENUM; // 链接类型
}>();

const emit = defineEmits<{
  change: [id: number];
}>();

/** 弹窗标题 */
const TITLE_MAP: Partial<Record<APP_LINK_TYPE_ENUM, string>> = {
  [APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_COMBINATION]: '选择拼团活动',
  [APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_NORMAL]: '选择商品',
  [APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_SECKILL]: '选择秒杀活动',
  [APP_LINK_TYPE_ENUM.COUPON_DETAIL]: '选择优惠券',
  [APP_LINK_TYPE_ENUM.ARTICLE_DETAIL]: '选择文章',
  [APP_LINK_TYPE_ENUM.DIY_PAGE_DETAIL]: '选择自定义页面',
};

/** 查询函数 */
const QUERY_FN_MAP: Partial<
  Record<APP_LINK_TYPE_ENUM, (params: any) => Promise<any>>
> = {
  [APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_COMBINATION]: getCombinationActivityPage,
  [APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_NORMAL]: async (params: any) =>
    await getSpuPage({ tabType: 0, ...params }),
  [APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_SECKILL]: getSeckillActivityPage,
  [APP_LINK_TYPE_ENUM.COUPON_DETAIL]: getCouponTemplatePage,
  [APP_LINK_TYPE_ENUM.ARTICLE_DETAIL]: getArticlePage,
  [APP_LINK_TYPE_ENUM.DIY_PAGE_DETAIL]: getDiyPagePage,
};

/** 表格列配置 */
function useGridColumns(): VxeTableGridOptions['columns'] {
  const radioColumn = { type: 'radio' as const, width: 55 };
  const picColumn = {
    align: 'center' as const,
    cellRender: { name: 'CellImage' },
    field: 'picUrl',
    title: '图片',
    width: 80,
  };
  switch (props.type) {
    case APP_LINK_TYPE_ENUM.ARTICLE_DETAIL: {
      return [
        radioColumn,
        picColumn,
        {
          field: 'title',
          minWidth: 260,
          showOverflow: 'tooltip',
          title: '文章标题',
        },
        { field: 'author', minWidth: 100, title: '作者' },
        {
          field: 'browseCount',
          align: 'center' as const,
          minWidth: 80,
          title: '浏览量',
        },
      ] as VxeTableGridOptions['columns'];
    }
    case APP_LINK_TYPE_ENUM.COUPON_DETAIL: {
      return [
        radioColumn,
        {
          field: 'name',
          minWidth: 200,
          showOverflow: 'tooltip',
          title: '优惠券名称',
        },
        {
          field: 'discountPrice',
          formatter: 'formatFenToYuanAmount',
          minWidth: 100,
          title: '优惠金额(元)',
        },
        {
          field: 'usePrice',
          formatter: 'formatFenToYuanAmount',
          minWidth: 110,
          title: '使用门槛(元)',
        },
        {
          field: 'takeCount',
          align: 'center' as const,
          minWidth: 80,
          title: '已领取',
        },
        {
          field: 'totalCount',
          align: 'center' as const,
          minWidth: 90,
          title: '发放总量',
        },
      ] as VxeTableGridOptions['columns'];
    }
    case APP_LINK_TYPE_ENUM.DIY_PAGE_DETAIL: {
      return [
        radioColumn,
        {
          field: 'name',
          minWidth: 180,
          showOverflow: 'tooltip',
          title: '页面名称',
        },
        {
          field: 'remark',
          minWidth: 260,
          showOverflow: 'tooltip',
          title: '备注',
        },
      ] as VxeTableGridOptions['columns'];
    }
    case APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_COMBINATION: {
      return [
        radioColumn,
        picColumn,
        {
          field: 'name',
          minWidth: 180,
          showOverflow: 'tooltip',
          title: '活动名称',
        },
        {
          field: 'spuName',
          minWidth: 180,
          showOverflow: 'tooltip',
          title: '商品名称',
        },
        {
          field: 'combinationPrice',
          formatter: 'formatFenToYuanAmount',
          minWidth: 100,
          title: '拼团价(元)',
        },
      ] as VxeTableGridOptions['columns'];
    }
    case APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_NORMAL: {
      return [
        radioColumn,
        picColumn,
        {
          field: 'name',
          minWidth: 240,
          showOverflow: 'tooltip',
          title: '商品名称',
        },
        {
          field: 'price',
          formatter: 'formatFenToYuanAmount',
          minWidth: 100,
          title: '商品价格(元)',
        },
        {
          field: 'stock',
          align: 'center' as const,
          minWidth: 80,
          title: '库存',
        },
      ] as VxeTableGridOptions['columns'];
    }
    case APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_SECKILL: {
      return [
        radioColumn,
        picColumn,
        {
          field: 'name',
          minWidth: 180,
          showOverflow: 'tooltip',
          title: '活动名称',
        },
        {
          field: 'seckillPrice',
          formatter: 'formatFenToYuanAmount',
          minWidth: 100,
          title: '秒杀价(元)',
        },
        {
          field: 'stock',
          align: 'center' as const,
          minWidth: 80,
          title: '剩余库存',
        },
      ] as VxeTableGridOptions['columns'];
    }
    default: {
      return [radioColumn] as VxeTableGridOptions['columns'];
    }
  }
}

const visible = ref(false); // 弹窗显示状态
const selectedId = ref<number>(); // 选中的记录编号

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useGridColumns(),
    height: 450,
    radioConfig: {
      highlight: true,
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any) => {
          const queryFn = props.type ? QUERY_FN_MAP[props.type] : undefined;
          if (!queryFn) {
            return { list: [], total: 0 };
          }
          return await queryFn({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
          });
        },
      },
    },
  },
  gridEvents: {
    radioChange: ({ row }: any) => {
      selectedId.value = row.id;
    },
  },
});

/** 打开弹窗 */
async function open() {
  visible.value = true;
  selectedId.value = props.currentId;
  // 等待 Modal 和 Grid 组件挂载完成后再查询
  await nextTick();
  await gridApi.query();
}

/** 确认选择 */
function handleConfirm() {
  if (!selectedId.value) {
    message.warning('请先选择一条记录');
    return;
  }
  emit('change', selectedId.value);
  visible.value = false;
}

/** 对外暴露的方法 */
defineExpose({
  open,
});
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="TITLE_MAP[props.type as APP_LINK_TYPE_ENUM] || '选择'"
    width="65%"
    :destroy-on-close="true"
    @ok="handleConfirm"
  >
    <div v-if="props.currentId" class="mb-2 text-sm text-gray-400">
      当前链接参数编号：{{ props.currentId }}，重新选择后自动替换
    </div>
    <Grid />
  </Modal>
</template>
