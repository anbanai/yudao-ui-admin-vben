# 登录页内容移除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the shared login page's “其他方式登录” and “萌新必读” sections without changing authentication behavior.

**Architecture:** Keep the change in the shared `AuthenticationLogin` Vue component used by the application themes. Delete only the third-party login/document-link imports, event plumbing, and template nodes; leave form submission and remaining navigation untouched.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, pnpm, Turbo, vue-tsc.

---

### Task 1: Remove the two login-page sections

**Files:**
- Modify: `packages/effects/common-ui/src/ui/authentication/login.vue`

- [x] **Step 1: Remove unused dependencies and event plumbing**

Delete the `DocLink` and `ThirdPartyLogin` imports, remove the `thirdLogin` emit declaration, and remove `handleThirdLogin` because no remaining template node uses them.

- [x] **Step 2: Remove the template nodes**

Delete the `third-party-login` slot/`ThirdPartyLogin` block and the `DocLink` node. Preserve the registration block immediately before them and all login controls above it.

- [x] **Step 3: Verify references are gone**

Run:

```bash
rg -n "DocLink|thirdLogin|第三方登录|萌新必读|<ThirdPartyLogin" packages/effects/common-ui/src/ui/authentication/login.vue
```

Expected: no output.

- [x] **Step 4: Run typecheck for affected packages**

Run:

```bash
pnpm exec turbo run typecheck --filter=@vben/common-ui --filter=@vben/web-antd
```

Result: started successfully but was interrupted after approximately 3.5 minutes without output; no type errors were reported before interruption.

- [x] **Step 5: Review the final diff**

Run:

```bash
git diff -- packages/effects/common-ui/src/ui/authentication/login.vue
git status --short
```

Expected: only the intended shared component changes are present in the implementation diff, and pre-existing user changes are preserved.
