# Changed-file lint receipts

Executed against the 25 paths in changed-files.json, after final formatting:

- `eslint <changed-files>`: exit 0.
- `oxlint <changed-files>`: exit 0.
- `oxfmt --check <changed-files>`: exit 0.

ESLint/Oxlint produce empty logs on success. The generated lint configuration packages were bootstrapped with the existing tsdown executable; no source tooling configuration or lockfile was changed.
