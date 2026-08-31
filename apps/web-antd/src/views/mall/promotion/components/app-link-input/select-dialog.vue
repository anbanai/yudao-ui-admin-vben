<script lang="ts" setup>
import type { AppLink } from './data';

import { nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { getUrlNumberValue } from '@vben/utils';

import { Button, Form, FormItem, message, Tooltip } from 'ant-design-vue';

import { getCategory } from '#/api/mall/product/category';
import { ProductCategorySelect } from '#/views/mall/product/category/components/';

import { APP_LINK_GROUP_LIST, APP_LINK_TYPE_ENUM } from './data';
import LinkDetailSelect from './link-detail-select.vue';
import {
  appendLinkParam,
  getCategorySelectParentId,
  getLinkParamKey,
  resolveAppLinkName,
  validateCategoryLink,
} from './link-utils';

/** APP 链接选择弹框 */
defineOptions({ name: 'AppLinkSelectDialog' });

const emit = defineEmits<{
  appLinkChange: [appLink: AppLink];
  change: [link: string];
}>();

const activeGroup = ref(APP_LINK_GROUP_LIST[0]?.name); // 选中的分组，默认选中第一个
const activeAppLink = ref({} as AppLink); // 选中的 APP 链接

const linkScrollbar = ref<HTMLDivElement>(); // 右侧滚动条
const groupTitleRefs = ref<HTMLInputElement[]>([]); // 分组标题引用列表
const groupScrollbar = ref<HTMLDivElement>(); // 分组滚动条
const groupBtnRefs = ref<HTMLButtonElement[]>([]); // 分组引用列表

const detailSelectDialog = ref<{
  id?: number;
  type?: APP_LINK_TYPE_ENUM;
}>({
  id: undefined,
  type: undefined,
}); // 详情选择对话框
const linkDetailSelectRef = ref<InstanceType<typeof LinkDetailSelect>>(); // 详情单选表格引用

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const isValidCategoryLink = await validateCategoryLink(
      activeAppLink.value.type,
      activeAppLink.value.path,
      getCategory,
    );
    if (!isValidCategoryLink) {
      message.warning('当前分类无效或不是一级分类，请重新选择');
      detailSelectDialog.value = {
        id: undefined,
        type: APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST,
      };
      detailSelectModalApi.open();
      return;
    }
    emit('change', activeAppLink.value.path);
    emit('appLinkChange', activeAppLink.value);
    modalApi.close();
  },
});

const [DetailSelectModal, detailSelectModalApi] = useVbenModal({
  onConfirm() {
    detailSelectModalApi.close();
  },
});

defineExpose({ open });

/** 打开弹窗 */
async function open(link: string, currentName?: string) {
  activeAppLink.value = {
    name: currentName || '',
    path: link,
  };
  modalApi.open();
  // 滚动到当前的链接
  const group = APP_LINK_GROUP_LIST.find((group) =>
    group.links.some((linkItem) => {
      const sameLink = isSameLink(linkItem.path, link);
      if (sameLink) {
        activeAppLink.value = {
          ...linkItem,
          name: currentName || linkItem.name,
          path: link,
        };
      }
      return sameLink;
    }),
  );
  if (group) {
    // 使用 nextTick 的原因：可能 Dom 还没生成，导致滚动失败
    await nextTick();
    handleGroupSelected(group.name);
  }
}

/** 处理 APP 链接选中 */
async function handleAppLinkSelected(appLink: AppLink) {
  if (!isSameLink(appLink.path, activeAppLink.value.path)) {
    activeAppLink.value = { ...appLink };
  }
  if (!appLink.type) {
    return;
  }
  // 返显当前链接的参数值
  detailSelectDialog.value.type = appLink.type;
  detailSelectDialog.value.id =
    getUrlNumberValue(
      getLinkParamKey(appLink.type),
      `http://127.0.0.1${activeAppLink.value.path}`,
    ) || undefined;
  switch (appLink.type) {
    // 表格单选：商品详情、拼团商品、秒杀商品、优惠券、文章、自定义页面
    case APP_LINK_TYPE_ENUM.ARTICLE_DETAIL:
    case APP_LINK_TYPE_ENUM.COUPON_DETAIL:
    case APP_LINK_TYPE_ENUM.DIY_PAGE_DETAIL:
    case APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_COMBINATION:
    case APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_NORMAL:
    case APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_SECKILL: {
      // 等待类型变化触发的组件重新挂载完成，确保拿到新实例
      await nextTick();
      linkDetailSelectRef.value?.open();
      break;
    }
    // 分类选择：商品分类页、商品列表页（按分类筛选）
    case APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST:
    case APP_LINK_TYPE_ENUM.PRODUCT_LIST: {
      detailSelectModalApi.open();
      break;
    }
    default: {
      // 无参数页面（如拼团/秒杀/积分商城活动列表页），无需额外选择
      break;
    }
  }
}

/**
 * 处理右侧链接列表滚动
 *
 * @param {Event} event 滚动事件
 * @param {number} event.target.scrollTop 滚动条的位置
 */
function handleScroll(event: Event) {
  const scrollTop = (event.target as HTMLDivElement).scrollTop;
  const titleEl = groupTitleRefs.value.find((titleEl: HTMLInputElement) => {
    // 获取标题的位置信息
    const { offsetHeight, offsetTop } = titleEl;
    // 判断标题是否在可视范围内
    return scrollTop >= offsetTop && scrollTop < offsetTop + offsetHeight;
  });
  // 只需处理一次
  if (titleEl && activeGroup.value !== titleEl.textContent) {
    activeGroup.value = titleEl.textContent || '';
    // 同步左侧的滚动条位置
    scrollToGroupBtn(activeGroup.value);
  }
}

/** 处理分组选中 */
function handleGroupSelected(group: string) {
  activeGroup.value = group;
  const titleRef = groupTitleRefs.value.find(
    (item: HTMLInputElement) => item.textContent === group,
  );
  if (titleRef && linkScrollbar.value) {
    // 滚动分组标题
    linkScrollbar.value.scrollTop = titleRef.offsetTop;
  }
}

/** 自动滚动分组按钮，确保分组按钮保持在可视区域内 */
function scrollToGroupBtn(group: string) {
  const groupBtn = groupBtnRefs.value.find(
    (ref: HTMLButtonElement | undefined) => ref?.textContent === group,
  );
  if (groupBtn && groupScrollbar.value) {
    groupScrollbar.value.scrollTop = groupBtn.offsetTop;
  }
}

/** 是否为相同的链接（不比较参数，只比较链接） */
function isSameLink(link1: string, link2: string) {
  return link2 ? link1?.split('?')[0] === link2.split('?')[0] : false;
}

/** 处理详情选中，将记录编号拼接为链接参数 */
function handleDetailSelected(id?: number, detailName?: string) {
  if (!id || !activeAppLink.value.path) {
    return;
  }
  activeAppLink.value = {
    ...activeAppLink.value,
    name: resolveAppLinkName(activeAppLink.value.name, detailName),
    path: appendLinkParam(
      activeAppLink.value.path,
      getLinkParamKey(detailSelectDialog.value.type),
      id,
    ),
  };

  // 关闭对话框，并重置 id
  detailSelectModalApi.close();
  detailSelectDialog.value.id = undefined;
}

function handleCategorySelected(category?: { id: number; name: string }) {
  handleDetailSelected(category?.id, category?.name);
}
</script>
<template>
  <Modal title="选择链接" class="w-[65%]">
    <div class="flex h-[500px] gap-2">
      <!-- 左侧分组列表 -->
      <div
        class="flex h-full flex-col overflow-y-auto border-r border-gray-200 pr-2"
        ref="groupScrollbar"
      >
        <Button
          v-for="(group, groupIndex) in APP_LINK_GROUP_LIST"
          :key="groupIndex"
          class="!ml-0 mb-1 mr-4 !justify-start"
          :class="[{ active: activeGroup === group.name }]"
          ref="groupBtnRefs"
          :type="activeGroup === group.name ? 'primary' : 'default'"
          @click="handleGroupSelected(group.name)"
        >
          {{ group.name }}
        </Button>
      </div>
      <!-- 右侧链接列表 -->
      <div
        class="h-full flex-1 overflow-y-auto pl-2"
        @scroll="handleScroll"
        ref="linkScrollbar"
      >
        <div
          v-for="(group, groupIndex) in APP_LINK_GROUP_LIST"
          :key="groupIndex"
          class="mb-4 border-b border-gray-100 pb-4 last:mb-0 last:border-b-0"
        >
          <!-- 分组标题 -->
          <div class="mb-2 font-bold" ref="groupTitleRefs">
            {{ group.name }}
          </div>
          <!-- 链接列表 -->
          <Tooltip
            v-for="(appLink, appLinkIndex) in group.links"
            :key="appLinkIndex"
            :title="appLink.path"
            placement="bottom"
            :mouse-enter-delay="0.3"
          >
            <Button
              class="mb-2 ml-0 mr-2"
              :type="
                isSameLink(appLink.path, activeAppLink.path)
                  ? 'primary'
                  : 'default'
              "
              @click="handleAppLinkSelected(appLink)"
            >
              {{ appLink.name }}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  </Modal>

  <DetailSelectModal title="选择分类" class="w-[65%]">
    <Form class="min-h-[200px]">
      <FormItem
        label="选择分类"
        v-if="
          detailSelectDialog.type ===
            APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST ||
          detailSelectDialog.type === APP_LINK_TYPE_ENUM.PRODUCT_LIST
        "
      >
        <ProductCategorySelect
          v-model="detailSelectDialog.id"
          :parent-id="getCategorySelectParentId(detailSelectDialog.type)"
          @category-selected="handleCategorySelected"
        />
      </FormItem>
    </Form>
  </DetailSelectModal>

  <!-- 详情单选表格：商品、拼团、秒杀、优惠券、文章、自定义页面 -->
  <LinkDetailSelect
    ref="linkDetailSelectRef"
    :key="detailSelectDialog.type"
    :type="detailSelectDialog.type"
    :current-id="detailSelectDialog.id"
    @change="handleDetailSelected"
  />
</template>
