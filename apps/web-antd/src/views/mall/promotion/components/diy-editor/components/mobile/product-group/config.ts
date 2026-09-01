import type { ComponentStyle, DiyComponent } from '../../../util';

export type ProductGroupLayoutType = 'horizSwiper' | 'threeCol' | 'twoCol';
export type ProductGroupSortType =
  | 'default'
  | 'latest'
  | 'priceAsc'
  | 'priceDesc'
  | 'sales';

export interface ProductGroupFieldProperty {
  color: string;
  show: boolean;
}

/** 商品分组属性 */
export interface ProductGroupProperty {
  badge: {
    imgUrl: string;
    show: boolean;
  };
  borderRadiusBottom: number;
  borderRadiusTop: number;
  groupIds: number[];
  fields: {
    name: ProductGroupFieldProperty;
    price: ProductGroupFieldProperty;
  };
  layoutType: ProductGroupLayoutType;
  pageSize: number;
  showAll: boolean;
  sortType: ProductGroupSortType;
  space: number;
  sticky: boolean;
  style: ComponentStyle;
}

export const component = {
  id: 'ProductGroup',
  name: '商品分组',
  icon: 'lucide:panels-top-left',
  property: {
    groupIds: [],
    showAll: false,
    sticky: false,
    pageSize: 10,
    sortType: 'default',
    layoutType: 'threeCol',
    fields: {
      name: { show: true, color: '#000' },
      price: { show: true, color: '#ff3000' },
    },
    badge: { show: false, imgUrl: '' },
    borderRadiusTop: 8,
    borderRadiusBottom: 8,
    space: 8,
    style: {
      bgType: 'color',
      bgColor: '',
      marginLeft: 8,
      marginRight: 8,
      marginBottom: 8,
    } as ComponentStyle,
  },
} as DiyComponent<ProductGroupProperty>;
