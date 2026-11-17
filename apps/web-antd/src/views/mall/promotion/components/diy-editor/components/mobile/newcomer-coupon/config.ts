import type { ComponentStyle, DiyComponent } from '../../../util';
export interface NewcomerCouponProperty {
  templateId?: number;
  title: string;
  buttonText: string;
  style: ComponentStyle;
}
export const component = {
  id: 'NewcomerCoupon',
  name: '首页新人券',
  icon: 'lucide:ticket',
  property: {
    templateId: undefined,
    title: '新人专享礼',
    buttonText: '立即领取',
    style: {
      bgType: 'color',
      bgColor: '#fff7ed',
      marginBottom: 8,
    } as ComponentStyle,
  },
} as DiyComponent<NewcomerCouponProperty>;
