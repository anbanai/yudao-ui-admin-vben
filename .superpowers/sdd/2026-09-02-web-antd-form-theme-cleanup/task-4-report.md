# Task 4 Report

## Scope

Migrated dependency objects under `apps/web-antd/src/views/{mall,pay,mp,im}` only. Product changes remain in `web-antd`; shared form UI and the other application implementations were not changed.

## RED Evidence

The initial Task 4 run failed 5/8 assertions. The structural AST audit reported all 103 legacy dependency objects across the four wave-two trees. Four coupon lifecycle cases failed because the exported state/boundary controller did not exist. This established failures for bounded type switching, hydrate, exact payload conversion, reset, and API-failure unlock before production edits.

After the first migration pass, the AST test still failed on two empty subscriptions. This exposed a static disabled field and the order-price write dependency. The latter was moved to the `adjustPrice` user event rather than being dropped or retained inside resolution.

## GREEN Evidence

- Combined Task 2+3+4 focused run: 4 files, 40/40 tests passed with no unhandled errors.
- The four-tree AST test rejects legacy callback keys, missing resolvers, empty/false fields, omitted reads, and surplus trigger fields.
- Scoped contract scan: `VF001=0`, `VF003=0`. Deferred Task 7 findings remain exactly `VF006=10`, `VF007=1`; theme findings remain deferred to Task 9.
- `pnpm --filter @vben/web-antd typecheck`: exactly 47 existing errors, delta zero, and no diagnostics in Task 4 changed files.
- `git diff --check`: passed.

## Coupon Results

The new form default is universal scope. The real schema `onChange` boundary was exercised through 50 complete SPU/category/universal rounds (150 resolver/event evaluations and 150 atomic writes). SPU selection remains a multi-value array, category selection remains a scalar, and universal scope persists an empty array. Every switch clears both inactive selectors, so old values cannot leak.

Tests cover all three persisted scope conversions, edit hydrate, the three money conversions plus percent and validity conversion, exact submit payload, close/reopen reset, hidden selector visibility, and failed submission. The failure path unlocks in `finally` and preserves form state.

## Write Boundaries

Coupon selector clearing is performed by the `productScope` component's explicit `onChange` handler. Order-price derivation is performed by the `adjustPrice` component's explicit handler; rapid consecutive changes produce one ordered write per event. Dependency resolvers remain pure and return one atomic object. No generic compatibility wrapper was added.

## Self-Review

Resolver results preserve the required `if -> show -> componentProps -> rules -> disabled -> required` ordering. Static permanent hiding became `hide: true`; static disabled state moved to the schema property. All resolver subscriptions equal the fields read through `values`. No broad `any`, suppression, shared form-UI edit, or other application edit was introduced. External API mocking is limited to the pre-existing module-load pickup-store request in the order boundary test.
