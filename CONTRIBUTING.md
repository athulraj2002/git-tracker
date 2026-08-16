# Contributing

## Git hooks

This repo uses [husky](https://typicode.github.io/husky/) for git hooks. They install automatically via `npm install` (the root `prepare` script).

- **pre-commit** runs [lint-staged](https://github.com/lint-staged/lint-staged), which runs ESLint on staged `.ts`/`.tsx`/`.js`/`.jsx` files. This includes the `no-console` rule (`eslint.config.mjs`, allowing `console.warn`/`console.error`) plus every other lint rule already enforced by `nx run-many -t lint` — so a staged file with any lint error is blocked, not just `console.log`.
- **commit-msg** (`scripts/check-commit-msg.js`) enforces the commit message format below.

## Commit message format

```
Type: short imperative summary

Detailed summary of what changed and why - a sentence or a few bullet points.
```

**Type** is one of: `Feat`, `Fix`, `UI`, `Chore`, `Docs`, `Refactor`, `Test`, `Perf`, `Build`, `CI`, `Style`.

- `Feat` — new functionality
- `Fix` — bug fix
- `UI` — visual/styling-only change, no behavior change
- `Chore` — dependency bumps, config, tooling, anything not user-facing
- `Docs`, `Refactor`, `Test`, `Perf`, `Build`, `CI`, `Style` — as named

The subject line must start with `Type: ` followed by a short summary. Below it, separated by a blank line, include a **detailed summary** of what changed and why — the commit-msg hook rejects a message with no body (a subject line alone is not enough). `Merge ...`, `Revert ...`, `fixup!`, and `squash!` commits are exempt.

Example:

```
Feat: add GitLab OAuth sign-in

Adds GitlabOAuthService mirroring the GitHub OAuth flow (authorize URL,
code exchange, profile fetch), and wires GET /auth/gitlab +
/auth/gitlab/callback. Reuses OAuthStateService for CSRF-protected state
signing instead of duplicating it per provider.
```
