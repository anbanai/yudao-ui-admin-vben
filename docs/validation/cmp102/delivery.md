# CMP-102 管理端交付与验证

目标仓库：.paperclip-repositories/yudao-ui-admin-vben-78f7068c5376；基线 3c08bdbb13ddfe21dd81ac26e2feb42316ab7b8f。仅修改 web-antd。代码文件清单见 changed-files.json。

## 已实现

- 会员行内单人、会员多选、优惠券列表名单/标签入口共用发券组件；手机号 TXT/单列CSV导入、去重、格式与数量检查，标签按真实接口加载。
- send-preview -> 二次确认 -> send-submit；展示冻结模板面额/折扣上限/范围/门槛/有效期/叠加/限额、操作人、账号及手机号快照、失败明细。取消不submit，不调用旧send；预检可能留下后台允许的惰性记录。
- 批次号查询与恢复、同批次重试；busy防重复确认。未知提交跨组件/重开/刷新受pending保护，status0查询不当作失败终态。
- 券模板 couponType、兑换SPU/SKU、canStack/stackLimit/stackWithPromotion、newcomerOnly，保留ADMIN库存和每人限领配置；固定日期按后台要求以 YYYY-MM-DD HH:mm:ss 提交。
- 券模板推广入口，只对启用USER模板开放，由后台create生成推广码和小程序路径，展示/复制真实结果，重试复用幂等键。
- DIY营销组件库新增 NewcomerCoupon，保存 templateId/title/buttonText/style；选择时核验启用USER新人券。已向CMP-103交付字段协议；小程序实际渲染仍待联合验证。
- 等级倍率百分比、双倍时段/星期/时区、有效天数和真实累计统计；配置保存检查时区及时间成对。

## 接口与权限

使用既有 /member/config/get、save、/member/level/*、/member/point/record/statistics、/member/tag/list-all-simple、/product/spu/*、/promotion/coupon-template/*。
新增管理端封装：POST /promotion/coupon/send-preview、POST /send-submit?batchId、GET /send-batch?id、POST /promotion/coupon-promotion/create。
发券使用 promotion:coupon:send；结果查询使用 promotion:coupon:query；推广使用 promotion:coupon-template:query；积分统计使用 point:record:query。无新增菜单权限或假接口。

## 真实验证

运行环境 Node 26.13.0 / pnpm 11.16.0（项目声明 Node22/24；支持版本复核未完成）。已有依赖通过工作区内链接复用，未修改lockfile。系统git因Xcode工具缺失不可用，使用工作区已安装isomorphic-git核对与提交。

| 检查 | 实际结果 |
| --- | --- |
| Vitest 发券状态与真实确认组件挂载 | 2文件15项通过，取消/确认/失败/超时/重复点击/刷新恢复/status0旧读/多实例/导入均覆盖；见tests.txt |
| 修改的Vue SFC脚本与模板编译 | 11组件通过，见sfc.txt |
| 25个改动代码文件 ESLint / Oxlint / Oxfmt检查 | 全部exit0，见lint-results.md及对应日志 |
| web-antd vue-tsc | 未通过：基线379条，当前378条；新增0，消除旧发券组件1条；见type-comparison.json、typecheck.txt及baseline-typecheck.txt |
| 全仓Vitest | 63文件通过、3文件失败；507项通过、1项失败。stores/user清空userInfo断言失败；tree测试SVG路径因复用依赖越出Vite允许路径而无法加载；web-ele测试缺pinia无法加载。以上文件在原始基线也失败，基线另有不稳定的form-integration用例失败；见unit-all.txt和baseline-tests.txt |
| 生产build | 未取得编译结果：@vben/vite-config缺dist入口；尝试工作区stub后又遇node-utils缺execa/ora等依赖，见build.txt/stub.txt。不能声称构建通过 |
| 已部署接口/浏览器端到端联调 | 未运行：本轮无已部署后台及登录会话。测试使用真实前端状态/组件与受控API响应，不是已部署接口验证 |

## 复用与并行差异

CMP-87涉及会员权益与分享封面；保留其原有文件。准备副本开工时的 api/mall/product/spu/index.ts、views/mall/product/spu/components/promotion-panel.vue、form/index.vue、index.vue 改动均未纳入本任务提交。未改其他UI实现、后端或小程序分享链路。

## 仍需处理的接口限制

CouponBatchService对模板变化/批次回滚抛IllegalArgumentException，全局异常处理将其变成code500，网关超时也可返回同样错误；send-batch普通SELECT的status0并不能证明原事务回滚。因此UI保守保留pending，只允许同批次查询/重试，成功status1才解除；当模板已经改变导致该批次永远无法提交时，目前没有可靠的安全作废途径。已以CMP-106评论5d2ec381-84cd-49cf-a03d-14c67a529c20交给后台负责人，需要明确的业务失败终态或锁定后的作废接口后，再补“作废并重新预检”流程，不能把未知code500当成可重发。

本次交付真实前端代码及检查证据，尚不能宣称全流程发布验收通过。
