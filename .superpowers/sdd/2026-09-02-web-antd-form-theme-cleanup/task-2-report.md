# Task 2 Report

Status: complete

Commit: pending

## Files

- `apps/web-antd/src/views/ai/model/model/data.ts`
- `apps/web-antd/src/views/crm/contact/data.ts`
- `apps/web-antd/src/views/crm/receivable/data.ts`
- `apps/web-antd/src/views/form-schema-contracts/task-2-upgrade-breakpoints.test.ts`
- `apps/web-antd/src/views/hrm/insurance/month-record/detail/modules/batch-employee-record-form.vue`
- `apps/web-antd/src/views/hrm/insurance/month-record/detail/modules/employee-record-form.vue`
- `apps/web-antd/src/views/hrm/recruit/post/data.ts`
- `apps/web-antd/src/views/mall/product/property/data.ts`
- `apps/web-antd/src/views/system/area/data.ts`
- `apps/web-antd/src/views/system/dict/data.ts`

## RED/GREEN Evidence

RED: `pnpm exec vitest run apps/web-antd/src/views/form-schema-contracts/task-2-upgrade-breakpoints.test.ts` failed five focused cases. Four failed because the targeted fields did not expose `dependencies.resolve`; IP validation failed because Zod 4 has no `z.string().ip()` method.

GREEN: the same focused test command passes 5/5. It invokes each migrated schema resolver, exercises the returned customer change handlers, verifies custom range props receive current values/form actions without resolver writes, and checks IPv4, IPv6, and invalid-IP message behavior.

## Validation

- `pnpm check:web-antd-contracts` was run with each supported changed product directory. It reported 36 pre-existing violations in adjacent, out-of-scope legacy fields. None are on the migrated Task 2 fields.
- `pnpm --filter @vben/web-antd typecheck` reports exactly 47 remaining errors. None reference a Task 2 file; they are existing errors in BPM, CRM customer/permission, HRM employee detail, IM, Mall promotion/trade, and System components.
- `git diff --check` passes.

## Resolver Audit

Audited all four existing `dependencies.resolve` callbacks:

- Coupon template `productSpuIds`: pure `show` computation.
- Coupon template `productCategoryIds`: pure `show` computation.
- Reward activity `productSpuIds`: pure `show` computation.
- Reward activity `productCategoryIds`: pure `show` computation.

No hidden writes were found. The focused test calls each resolver with form actions and verifies no `setFieldValue` calls. No changes were necessary.

## Self-review and Concerns

The static props remain static; only state-dependent props are produced by atomic resolvers. Form writes occur only in returned change handlers. The HRM slot-only change has no practical component test fixture, so it is covered by the app typecheck. The typecheck remains red solely because of the 47 unrelated baseline errors listed above.
