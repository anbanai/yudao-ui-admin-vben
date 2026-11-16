# Logo 资源场景化替换设计

## 目标

将 `/Users/medivh/Desktop/tws-logo/` 中的品牌资源接入当前主应用 `apps/web-antd`，让后台导航和登录页在不同尺寸下使用合适的 logo 形态，避免横向完整标在 42px 图标槽位中缩放后不可读。

## 资源映射

| 场景 | 资源 | 接入方式 |
| --- | --- | --- |
| 侧栏展开、侧栏收起、登录页左上角、移动端 | `不忍独享  水印-08.png` | 复制为 `apps/web-antd/public/branding/logo-mark.png`，通过 `preferences.logo.source` 使用 |
| 登录页的大尺寸品牌展示区域 | `不忍独享  水印-06.png` | 复制为 `apps/web-antd/public/branding/logo-full.png`，通过 `AuthPageLayout` 的 `sloganImage` 使用 |
| 当前常规导航 | `水印-07.png`、`水印-09.png` | 不接入；竖排文字在窄槽位中可读性和留白不足 |

应用名称继续来自 `VITE_APP_TITLE`，不把文字重复烧录到导航组件中。现有主题、布局模式、favicon 和其他组件库应用保持不变。

## 实现边界

1. 在 `apps/web-antd/src/preferences.ts` 覆盖 `logo.source` 为 `/branding/logo-mark.png`。
2. 在 `apps/web-antd/src/layouts/auth.vue` 将 `/branding/logo-full.png` 传给 `AuthPageLayout` 的 `sloganImage`。
3. 在共享认证布局的品牌展示图片上增加 `object-contain`，保证正方形 PNG 画布在左右分栏中不被拉伸；默认未传 `sloganImage` 的其他应用行为不变。
4. 只新增正式应用需要的两张 PNG 资源，使用 `/branding/` 稳定 URL，避免共享偏好包直接依赖某个应用的源码资源。

## 验证标准

- `pnpm --filter @vben/web-antd build` 成功完成。
- 构建产物中包含 `branding/logo-mark.png` 和 `branding/logo-full.png`，且没有对远程 Vben logo 的运行时引用。
- 代码检查确认偏好配置、登录布局和共享认证组件类型通过。
- 手工检查登录页：左上角图形标与标题可读，品牌展示图不变形；后台侧栏展开和收起状态均显示 08 图形标。

## 非目标

- 不修改 `apps/web-antdv-next`、`apps/web-ele`、`apps/web-naive`、`apps/web-tdesign` 的品牌配置。
- 不替换浏览器 favicon，不调整登录页整体布局、背景或文案。
- 不对原始 PNG 做裁剪、重绘或颜色改造。
