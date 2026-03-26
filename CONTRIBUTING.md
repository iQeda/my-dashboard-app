# Contributing

Thank you for your interest in contributing to MyDashboard!

## Development

```bash
asdf install nodejs 22 && asdf set nodejs 22
pnpm install
cargo tauri dev
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Ensure builds pass: `pnpm build && cd src-tauri && cargo check`
5. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
6. Push and open a PR against `main`
7. At least 1 approval is required to merge

## Code Style

- TypeScript: all types use `readonly` properties
- React: named export function components, props-based
- Rust: `serde` rename for JSON camelCase fields
- Tailwind CSS classes directly (no CSS modules)
- All UI text via `t()` i18n function

## Reporting Bugs

Use the [Bug Report](https://github.com/iQeda/my-dashboard-app/issues/new?template=bug_report.md) template.
