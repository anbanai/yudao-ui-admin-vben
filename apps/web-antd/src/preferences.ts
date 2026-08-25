import {
  defineOverridesPreferences,
  definePreferencesExtension,
} from '@vben/preferences';

interface WebAntdPreferencesExtension {
  defaultTableSize: number;
  enableFormFullscreen: boolean;
  reportTitle: string;
  tenantMode: 'multi' | 'single';
}

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    /** 后端路由模式 */
    accessMode: 'backend',
    name: import.meta.env.VITE_APP_TITLE,
    enableRefreshToken: true,
    /** 双列菜单布局（参照有赞后台：左侧主导航 + 二级菜单面板） */
    layout: 'sidebar-mixed-nav',
    /** 悬浮面板模式：侧边栏/顶栏/内容区以圆角卡片悬浮于画布之上 */
    panelFloat: true,
    /** 仅在 Ant Design 应用中开放悬浮面板切换 */
    panelFloatSettingShow: true,
  },
  logo: {
    source: '/branding/logo-mark.png',
  },
  tabbar: {
    /** 朴素风格标签页，配合悬浮面板更接近有赞样式 */
    styleType: 'plain',
  },
  theme: {
    /** 加大全局圆角，匹配悬浮面板风格 */
    radius: '0.75',
  },
  footer: {
    /** 默认关闭 footer 页脚，因为有一定遮挡 */
    enable: false,
    fixed: false,
  },
  copyright: {
    companyName: '峨眉山不忍独享茶业有限公司',
    companySiteLink: 'https://teaworthshare.com',
    date: '2026',
    icp: '蜀ICP备2025128192号-2',
    icpLink: 'https://beian.miit.gov.cn/',
  },
});

export const preferencesExtension =
  definePreferencesExtension<WebAntdPreferencesExtension>({
    tabLabel: 'preferences.antd.tabLabel',
    title: 'preferences.antd.title',
    fields: [
      {
        component: 'switch',
        defaultValue: true,
        key: 'enableFormFullscreen',
        label: 'preferences.antd.fields.enableFormFullscreen.label',
        tip: 'preferences.antd.fields.enableFormFullscreen.tip',
      },
      {
        component: 'select',
        defaultValue: 'single',
        key: 'tenantMode',
        label: 'preferences.antd.fields.tenantMode.label',
        options: [
          {
            label: 'preferences.antd.fields.tenantMode.options.single.label',
            value: 'single',
          },
          {
            label: 'preferences.antd.fields.tenantMode.options.multi.label',
            value: 'multi',
          },
        ],
      },
      {
        component: 'number',
        componentProps: {
          max: 200,
          min: 10,
          step: 10,
        },
        defaultValue: 20,
        key: 'defaultTableSize',
        label: 'preferences.antd.fields.defaultTableSize.label',
      },
      {
        component: 'input',
        defaultValue: '',
        key: 'reportTitle',
        label: 'preferences.antd.fields.reportTitle.label',
        placeholder: 'preferences.antd.fields.reportTitle.placeholder',
      },
    ],
  });
