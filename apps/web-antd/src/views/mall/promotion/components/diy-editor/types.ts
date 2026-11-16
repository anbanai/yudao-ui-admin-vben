/** 页面装修组件 */
export interface DiyComponent<T> {
  uid?: number; // 用于区分同一种组件的不同实例
  id: string; // 组件唯一标识
  name: string; // 组件名称
  icon: string; // 组件图标
  /*
   组件位置：
    top: 固定于手机顶部，例如 顶部的导航栏
    bottom: 固定于手机底部，例如 底部的菜单导航栏
    center: 位于手机中心，每个组件占一行，顺序向下排列
    空：同 center
    fixed: 由组件自己决定位置，如弹窗位于手机中心、浮动按钮一般位于手机右下角
  */
  position?: '' | 'bottom' | 'center' | 'fixed' | 'top';
  property: T; // 组件属性
}

/** 页面装修组件库 */
export interface DiyComponentLibrary {
  name: string; // 组件库名称
  extended: boolean; // 是否展开
  components: string[]; // 组件列表
}

/** 组件样式 */
export interface ComponentStyle {
  bgType: 'color' | 'img'; // 背景类型
  bgColor: string; // 背景颜色
  bgImg: string; // 背景图片
  // 外边距
  margin: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  // 内边距
  padding: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  // 边框圆角
  borderRadius: number;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomRightRadius: number;
  borderBottomLeftRadius: number;
}

/** 页面组件，只保留组件 ID 和属性。 */
export type PageComponent = Pick<DiyComponent<any>, 'id' | 'property'>;
