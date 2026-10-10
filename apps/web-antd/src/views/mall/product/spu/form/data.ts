import type { VbenFormSchema } from '#/adapter/form';

import { DeliveryTypeEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';
import { handleTree } from '@vben/utils';

import { getSimpleBrandList } from '#/api/mall/product/brand';
import { getCategoryList } from '#/api/mall/product/category';
import { getSelectableGroupList } from '#/api/mall/product/group';
import { getSimpleMerchantList } from '#/api/mall/product/merchant';
import { getSimpleTemplateList } from '#/api/mall/trade/delivery/expressTemplate';

/** 基础设置的表单 */
export function useInfoFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'name',
      label: '商品名称',
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '请输入商品名称',
      },
      rules: 'required',
    },
    {
      fieldName: 'categoryId',
      label: '分类名称',
      component: 'ApiTreeSelect',
      componentProps: {
        api: async () => {
          const data = await getCategoryList({});
          return handleTree(data);
        },
        fieldNames: { label: 'name', value: 'id', children: 'children' },
        placeholder: '请选择商品分类',
      },
      rules: 'required',
    },
    {
      fieldName: 'merchantId',
      label: '所属商家',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleMerchantList,
        labelField: 'storeName',
        valueField: 'id',
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '请选择已审核商家',
      },
      rules: 'required',
    },
    {
      fieldName: 'groupIds',
      label: '商品分组',
      component: 'ApiSelect',
      componentProps: {
        api: getSelectableGroupList,
        disabledField: 'disabled',
        labelField: 'label',
        valueField: 'id',
        mode: 'multiple',
        // 停用成员保持只读；关闭一键清空，避免连同停用成员一起移除。
        allowClear: false,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '请选择商品分组（可多选）',
      },
    },
    {
      fieldName: 'brandId',
      label: '商品品牌',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleBrandList,
        labelField: 'name',
        valueField: 'id',
        allowClear: true,
        placeholder: '请选择商品品牌',
      },
      dependencies: {
        triggerFields: ['merchantId'],
        resolve: ({ values }) => ({
          componentProps: {
            api: () => getSimpleBrandList({ merchantId: values.merchantId }),
            disabled: !values.merchantId,
          },
        }),
      },
      rules: 'required',
    },
    {
      fieldName: 'keyword',
      label: '商品关键字',
      component: 'Input',
      componentProps: {
        placeholder: '请输入商品关键字',
      },
    },
    {
      fieldName: 'introduction',
      label: '商品简介',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入商品简介',
        autoSize: { minRows: 2, maxRows: 2 },
        showCount: true,
        maxlength: 128,
        allowClear: true,
      },
    },
    {
      fieldName: 'picUrl',
      label: '商品封面图',
      component: 'ImageUpload',
      componentProps: {
        maxSize: 3,
        accept: ['jpg', 'jpeg', 'png', 'bmp'],
        scene: 'product',
      },
      rules: 'required',
    },
    {
      fieldName: 'sliderPicUrls',
      label: '商品轮播图',
      component: 'ImageUpload',
      componentProps: {
        maxNumber: 10,
        multiple: true,
        maxSize: 3,
        accept: ['jpg', 'jpeg', 'png', 'bmp'],
        scene: 'product',
        sortable: true,
      },
      rules: 'required',
    },
    {
      fieldName: 'isPreSale',
      label: '销售方式',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '现货', value: false },
          { label: '预售', value: true },
        ],
      },
      rules: 'required',
    },
    {
      fieldName: 'deliveryDaysPreset',
      label: '付款后发货',
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '3 天', value: 3 },
          { label: '5 天', value: 5 },
          { label: '7 天', value: 7 },
          { label: '15 天', value: 15 },
          { label: '自定义', value: 'custom' },
        ],
        placeholder: '请选择发货周期',
      },
      dependencies: {
        triggerFields: ['isPreSale'],
        resolve({ values }) {
          return { show: values.isPreSale === true };
        },
      },
      rules: 'required',
    },
    {
      fieldName: 'customDeliveryDays',
      label: '自定义天数',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 1,
        precision: 0,
      },
      dependencies: {
        triggerFields: ['isPreSale', 'deliveryDaysPreset'],
        resolve({ values }) {
          return {
            show:
              values.isPreSale === true &&
              values.deliveryDaysPreset === 'custom',
          };
        },
      },
      rules: 'required',
    },
  ];
}

/** 价格库存的表单 */
export function useSkuFormSchema(
  propertyList: any[] = [],
  isDetail: boolean = false,
  legacySingleSpec: boolean = false,
): VbenFormSchema[] {
  const hasCompleteProperties =
    propertyList.length > 0 &&
    propertyList.every(
      (property) =>
        Array.isArray(property.values) && property.values.length > 0,
    );

  return [
    {
      fieldName: 'id',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'subCommissionType',
      label: '分销类型',
      component: 'RadioGroup',
      componentProps: {
        allowClear: true,
        options: [
          {
            label: '默认设置',
            value: false,
          },
          {
            label: '单独设置',
            value: true,
          },
        ],
      },
      rules: 'required',
    },
    // 多规格时显示的商品属性（占位，实际通过插槽渲染）
    {
      fieldName: 'productAttributes',
      label: '商品属性',
      component: 'Input',
    },
    {
      fieldName: 'legacySkuList',
      label: '规格列表',
      component: 'Input',
      hide: !legacySingleSpec || hasCompleteProperties,
    },
    // 多规格 - 批量设置
    {
      fieldName: 'batchSkuList',
      label: '批量设置',
      component: 'Input',
      hide: !hasCompleteProperties || isDetail,
    },
    // 多规格 - 规格列表
    {
      fieldName: 'multiSkuList',
      label: '规格列表',
      component: 'Input',
      hide: !hasCompleteProperties,
    },
  ];
}

/** 物流设置的表单 */
export function useDeliveryFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'deliveryTypes',
      label: '配送方式',
      component: 'CheckboxGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.TRADE_DELIVERY_TYPE, 'number'),
      },
      rules: 'required',
    },
    {
      fieldName: 'deliveryTemplateId',
      label: '运费模板',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleTemplateList,
        labelField: 'name',
        valueField: 'id',
      },
      dependencies: {
        triggerFields: ['deliveryTypes'],
        resolve({ values }) {
          return {
            show:
              !!values.deliveryTypes &&
              values.deliveryTypes.includes(DeliveryTypeEnum.EXPRESS.type),
          };
        },
      },
      rules: 'required',
    },
  ];
}

/** 商品详情的表单 */
export function useDescriptionFormSchema(
  onUploadingChange?: (uploading: boolean) => void,
): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'description',
      label: '商品详情',
      component: 'RichTextarea',
      componentProps: {
        placeholder: '请输入商品详情',
        height: 1000,
        imageUploadScene: 'product',
        onUploadingChange,
      },
      rules: 'required',
    },
  ];
}

/** 其它设置的表单 */
export function useOtherFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'sort',
      label: '商品排序',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
      },
      rules: 'required',
    },
    {
      fieldName: 'giveIntegral',
      label: '赠送积分',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
      },
      rules: 'required',
    },
    {
      fieldName: 'virtualSalesCount',
      label: '虚拟销量',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
      },
      rules: 'required',
    },
    {
      fieldName: 'buyLimit',
      label: '限购数量',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '0 表示不限购',
      },
      rules: 'required',
    },
    {
      fieldName: 'buyLimitLevel',
      label: '等级限购',
      component: 'Select',
      componentProps: {
        options: [
          { label: '全部', value: 'ALL' },
          { label: 'L0', value: 'L0' },
          { label: 'L1', value: 'L1' },
          { label: 'L2', value: 'L2' },
          { label: 'L3', value: 'L3' },
        ],
      },
      rules: 'required',
    },
    {
      fieldName: 'pointDiscountRate',
      label: '积分抵扣比例',
      component: 'InputNumber',
      componentProps: {
        addonAfter: '（0-1）',
        class: '!w-full',
        max: 1,
        min: 0,
        precision: 2,
        step: 0.1,
      },
      rules: 'required',
    },
  ];
}
