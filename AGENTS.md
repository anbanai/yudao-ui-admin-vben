# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm workspace managed by Turbo. User-facing Vue 3 applications live in `apps/` (`web-antd`, `web-antdv-next`, `web-ele`, `web-naive`, and `web-tdesign`). Reusable functionality belongs in `packages/`, while shared build, lint, TypeScript, and Vite tooling is under `internal/`. Documentation is in `docs/`; automation and release scripts are in `scripts/`. Put unit tests beside the code they cover, commonly in `__tests__/` directories or `*.test.ts` files.

For product and UI changes, use only the `apps/web-antd` application and its Ant Design Vue components. Do not add equivalent changes to the other UI implementations unless the task explicitly requests it.

## Build, Test, and Development Commands

Use Node.js `22.18+` (or Node 24) and pnpm `11+`; do not use npm or yarn.

- `pnpm install` installs workspace dependencies.
- `pnpm dev:antd` starts the Ant Design app; use `dev:ele`, `dev:naive`, `dev:tdesign`, or `dev:antdv-next` for another shell.
- `pnpm build` builds all Turbo packages; `pnpm build:antd` targets one app.
- `pnpm test:unit` runs Vitest in the `happy-dom` environment.
- `pnpm check:type` runs workspace TypeScript checks; `pnpm check` adds circular-dependency, dependency, and spelling checks.
- `pnpm lint` checks formatting and lint rules; `pnpm format` applies the repository formatter.

## Coding Style & Naming Conventions

Write TypeScript and Vue SFCs using the existing ESLint, Oxlint, Oxfmt, and Stylelint configurations. Use two-space indentation, single quotes in TypeScript, and explicit types where inference is unclear. Name Vue components in PascalCase, composables with a `use` prefix, and tests as `*.test.ts`. Keep feature code in the relevant app/module and shared code in the smallest appropriate package.

## Testing Guidelines

Vitest is the unit-test framework. Add regression tests for behavior changes and keep tests near their implementation. Run a focused file with `pnpm exec vitest run path/to/file.test.ts`, then run `pnpm test:unit` for broader coverage. End-to-end tests, when defined by an app, are run through `pnpm test:e2e`.

## Commit & Pull Request Guidelines

Commits follow Conventional Commits, for example `feat(mall): add ...` or `fix: handle ...`. Allowed types include `feat`, `fix`, `perf`, `style`, `docs`, `test`, `refactor`, `build`, `ci`, `chore`, `revert`, `types`, and `release`; keep headers at or below 108 characters. `pnpm commit` opens the configured commit prompt, and hooks run lint, formatting, type checks, and commitlint. Pull requests should explain the user-visible change, link the related issue when applicable, list validation commands, and include screenshots or recordings for UI changes.

When local hooks take too long, it is acceptable to use `git commit --no-verify` to skip them. Before opening a pull request, run the checks relevant to the changed code manually and report any skipped validation in the pull request description.

## Security & Configuration Tips

Keep credentials and machine-specific overrides in ignored `.env.local` or `.env.*.local` files. Never commit secrets or unrelated generated output such as `dist/`, coverage reports, or `.turbo/` artifacts.
