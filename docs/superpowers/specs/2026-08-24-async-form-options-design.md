# Async Form Options Design

## Goal

Ensure asynchronous select and tree-select options in `apps/web-antd` are loaded by the form component instead of being captured as empty arrays or passed as nested Vue refs.

## Scope

Fix these four affected flows:

1. Product selection dialog category filter.
2. Shared product selector category filter.
3. Pickup-order store filter.
4. WeChat free-publish account filter.

The existing product-list category fix remains unchanged. Other UI applications and unrelated module-level lookup arrays are out of scope.

## Design

Use the repository's existing `ApiTreeSelect` and `ApiSelect` components as the owner of asynchronous loading.

- Product category filters call `getCategoryList({})`, transform the flat response with `handleTree`, and return the tree from the component `api` callback.
- Components that also format category names update their local flat-category cache from the same response.
- The pickup-order store loader calls `getSimpleDeliveryPickUpStoreList`, filters the result to stores the current user can verify, and returns the filtered array. `autoSelect: 'first'` replaces the eager default value that was evaluated before loading completed.
- The free-publish account field calls `getSimpleAccountList` through `ApiSelect` and maps `name` and `id` through `labelField` and `valueField`.

No request retry or new global cache is introduced. Existing API error handling in `ApiSelect` and `ApiTreeSelect` remains responsible for loading failures.

## Data Flow

1. The form field mounts.
2. The API component invokes its configured loader.
3. The loader filters or transforms the response where required.
4. The API component stores the returned array and passes plain option data to Ant Design Vue.
5. Selection values continue using the existing field names and request formats.

## Testing

Add focused Vitest regressions that verify:

- Product categories are fetched and converted to a tree.
- Pickup stores are filtered by the signed-in user's verifier membership and the first available store is selected through the API component.
- WeChat accounts are loaded through an API-backed select.

Run the focused tests and `pnpm --filter @vben/web-antd typecheck` after implementation.
