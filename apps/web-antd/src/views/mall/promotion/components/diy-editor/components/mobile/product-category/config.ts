import type { ComponentStyle, DiyComponent } from '../../../util';

export type ProductCategoryLayoutType = 'horizSwiper' | 'threeCol' | 'twoCol';
export type ProductCategorySortType =
  | 'default'
  | 'latest'
  | 'priceAsc'
  | 'priceDesc'
  | 'sales';

export interface ProductCategoryFieldProperty {
  color: string;
  show: boolean;
}

export interface ProductCategoryProperty {
  badge: {
    imgUrl: string;
    show: boolean;
  };
  borderRadiusBottom: number;
  borderRadiusTop: number;
  categoryIds: number[];
  fields: {
    name: ProductCategoryFieldProperty;
    price: ProductCategoryFieldProperty;
  };
  layoutType: ProductCategoryLayoutType;
  pageSize: number;
  showAll: boolean;
  sortType: ProductCategorySortType;
  space: number;
  sticky: boolean;
  style: ComponentStyle;
}

export const component = {
  id: 'ProductCategory',
  name: '商品分类',
  icon: 'lucide:folder-tree',
  property: {
    categoryIds: [],
    showAll: false,
    sticky: false,
    pageSize: 10,
    sortType: 'default',
    layoutType: 'twoCol',
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
} as DiyComponent<ProductCategoryProperty>;
