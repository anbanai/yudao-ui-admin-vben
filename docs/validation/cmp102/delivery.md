# CMP-102 管理端交付与验证

目标仓库：.paperclip-repositories/yudao-ui-admin-vben-78f7068c5376；基线 3c08bdbb13ddfe21dd81ac26e2feb42316ab7b8f。仅修改 web-antd。代码文件清单见 changed-files.json。本轮基于 2c0ec1cde8cbb9ce7e89e76a9b08bd5e55ed2cfa 修复退回审查中的批次终态锁死，并接入安全作废。

## 已实现

- 会员行内单人、会员多选、优惠券列表名单/标签入口共用发券组件；手机号 TXT/单列CSV导入、去重、格式与数量检查，标签按真实接口加载。
- send-preview -> 二次确认 -> send-submit；展示冻结模板面额/折扣上限/范围/门槛/有效期/叠加/限额、操作人、账号及手机号快照、失败明细。取消不submit，不调用旧send；预检可能留下后台允许的惰性记录。
- 批次号查询与恢复、同批次重试；busy防重复确认。未知提交跨组件/重开/刷新受pending保护，status0查询不当作失败终态。成功/失败/取消（1/2/3）均解除保护，可完成、关闭并重新预检；只有明确点击安全作废才请求send-cancel，作废失败时查询同批次真实终态。
- 券模板 couponType、兑换SPU/SKU、canStack/stackLimit/stackWithPromotion、newcomerOnly，保留ADMIN库存和每人限领配置；固定日期按后台要求以 YYYY-MM-DD HH:mm:ss 提交。
- 券模板推广入口，只对启用USER模板开放，由后台create生成推广码和小程序路径，展示/复制真实结果，重试复用幂等键。
- DIY营销组件库新增 NewcomerCoupon，保存 templateId/title/buttonText/style；选择时核验启用USER新人券。已向CMP-103交付字段协议；小程序实际渲染仍待联合验证。
- 等级倍率百分比、双倍时段/星期/时区、有效天数和真实累计统计；配置保存检查时区及时间成对。

## 接口与权限

使用既有 /member/config/get、save、/member/level/*、/member/point/record/statistics、/member/tag/list-all-simple、/product/spu/*、/promotion/coupon-template/*。
新增管理端封装：POST /promotion/coupon/send-preview、POST /send-submit?batchId、GET /send-batch?id、POST /send-cancel?batchId、POST /promotion/coupon-promotion/create。
发券和安全作废使用 promotion:coupon:send；结果查询使用 promotion:coupon:query；推广使用 promotion:coupon-template:query；积分统计使用 point:record:query。无新增菜单权限或假接口。

## 真实验证

运行环境 Node 26.13.0 / pnpm 11.16.0（项目声明 Node22/24；支持版本复核未完成）。已有依赖通过工作区内链接复用，未修改lockfile。系统git因Xcode工具缺失不可用，使用工作区已安装isomorphic-git核对与提交。

| 检查 | 实际结果 |
| --- | --- |
| Vitest 发券状态与真实确认组件挂载 | 2文件33项通过（全量运行也通过这33项）；覆盖成功/失败/取消恢复与重新预检、提交超时读取终态、安全作废和提交竞争、作废超时/旧读保护、普通取消不发券；见revision-tests.txt |
| 修改的Vue SFC脚本与模板编译 | 初轮11组件通过；本轮改动的2组件重新通过，见revision-sfc.txt |
| ESLint / Oxlint / Oxfmt检查 | 初轮25文件通过；本轮6个改动代码文件全部exit0，见revision-checks.json及revision-{eslint,oxlint,oxfmt}.txt |
| web-antd vue-tsc | 未通过：当前378条，与上一提交378条一致，新增0；初始基线379条。见revision-type-comparison.json及revision-typecheck.txt |
| 全仓Vitest | 本轮62文件通过、4文件失败；524项通过、2项失败。stores/user清空userInfo断言及form-integration的blur/change校验触发断言失败；tree的SVG越出Vite允许路径、web-ele缺pinia两套件无法加载。原始基线已有这四项问题；见revision-unit-all.txt和baseline-tests.txt |
| 生产build | 重试仍未取得应用编译结果：@vben/vite-config缺dist入口；见revision-build.txt。前轮stub亦缺node-utils依赖，不能声称构建通过 |
| 已部署接口/浏览器端到端联调 | 未运行：本轮无已部署后台及登录会话。测试使用真实前端状态/组件与受控API响应，不是已部署接口验证 |

## 复用与并行差异

CMP-87涉及会员权益与分享封面；保留其原有文件。准备副本开工时的 api/mall/product/spu/index.ts、views/mall/product/spu/components/promotion-panel.vue、form/index.vue、index.vue 改动均未纳入本任务提交。未改其他UI实现、后端或小程序分享链路。

## 本轮接口核对与审查修复

已核对当前后端副本 CouponSendBatchStatusEnum、CouponBatchService 和 CouponController：PENDING=0、SUCCEEDED=1、FAILED=2、CANCELED=3；send-submit回滚后另事务写入FAILED；send-cancel按batchId持锁，只作废本人待提交批次，成功返回CANCELED；若并发提交已完成则拒绝作废，前端随后查询真实终态。因此此前“后端缺少终态/安全作废”的限制说明已过时，本轮撤回并完成接入。对接时后端这三处为工作区待提交修订，字段来源和源码摘要见revision-backend-contract.json，不能据此宣称已部署。

恢复、提交响应、提交超时后的查询，以及安全作废响应/补查均将1/2/3视为终态。终态保留快照和失败详情，解除pending/uncertain，隐藏发放按钮并允许完成；完成后新预检更换幂等键。状态0旧读、超时及未知状态不解除保护。普通“取消确认”只清本地惰性预检，不调用submit或cancel；未知待提交批次的“安全作废”是独立明确操作。

回归先红后绿：revision-terminal-red.txt记录7项预期失败，revision-discard-red.txt记录新增作废行为缺失的8项预期失败。最终33项专项测试通过。只读review_marketing复核未发现Important/Critical；结论见revision-review.md。

本轮Node仍为26.13.0。pnpm启动器因corepack临时缓存目录不可写而未执行；后续直接运行package.json脚本对应的工作区二进制（vitest run --dom、vue-tsc --noEmit --skipLibCheck、vite build --mode production），没有修改依赖配置或lockfile。完整依赖/支持Node版本、构建、部署接口及小程序DIY端到端验证仍未完成。本次交付真实前端代码及检查证据，不宣称全流程发布验收通过。
