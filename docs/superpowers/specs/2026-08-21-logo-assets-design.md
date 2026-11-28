# Logo 资源场景化替换设计

## 目标

将用户提供的「茶引力」绿底 Logo 接入管理后台，让导航、登录页、浏览器图标和分享海报都使用同一品牌图形。

## 资源映射

| 场景 | 资源 | 接入方式 |
| --- | --- | --- |
| 侧栏展开、侧栏收起、登录页左上角、移动端 | 品牌图标 | 复制为两套已配置后台的 `public/branding/logo-mark.png`，通过 `preferences.logo.source` 使用 |
| 登录页的大尺寸品牌展示区域 | 完整品牌图 | 复制为两套已配置后台的 `public/branding/logo-full.png`，通过 `AuthPageLayout` 的 `sloganImage` 使用 |
| 管理后台浏览器标签页 | 品牌图标 | 替换两套已配置后台的 `public/favicon.ico` |
| 商品推广弹窗和海报 | 品牌图标 | 共用 `apps/web-antd/public/branding/logo-mark.png` |
| 当前常规导航 | `水印-07.png`、`水印-09.png` | 不接入；竖排文字在窄槽位中可读性和留白不足 |

应用名称继续来自 `VITE_APP_TITLE`，不把文字重复烧录到导航组件中。

## 实现边界

1. 在已配置的后台应用偏好中覆盖 `logo.source` 为 `/branding/logo-mark.png`。
2. 在已配置的后台登录布局将 `/branding/logo-full.png` 传给 `AuthPageLayout` 的 `sloganImage`。
3. 在共享认证布局的品牌展示图片上增加 `object-contain`，保证正方形 PNG 画布在左右分栏中不被拉伸；默认未传 `sloganImage` 的其他应用行为不变。
4. 使用 `/branding/` 稳定 URL，避免共享偏好包直接依赖某个应用的源码资源。

## 验证标准

- `pnpm --filter @vben/web-antd build` 成功完成。
- 已配置后台的开发登录页均显示品牌图标和完整品牌图。
- 构建产物中包含 `branding/logo-mark.png` 和 `branding/logo-full.png`，且没有对远程 Vben logo 的运行时引用。
- 代码检查确认偏好配置、登录布局和共享认证组件类型通过。
- 手工检查登录页：左上角图形标与标题可读，品牌展示图不变形；后台侧栏展开和收起状态均显示 08 图形标。

共享的 AntDV Next 应用存在未随本品牌改动引入的缺失财务组件，完整构建仍需单独修复该模块。
