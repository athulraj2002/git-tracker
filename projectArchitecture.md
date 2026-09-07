# 🚀 Git Tracker – Project Architecture

## 📌 Project Overview

A web application that connects to GitHub (with GitLab/Bitbucket sign-in also
available) to track contribution activity across the repositories a user
chooses to follow, and visualize it on a dashboard — filterable by date
range, repo, and contributor. AI insights and Slack integration are part of
the long-term vision (see **Future Enhancements**) but are not built yet;
this document describes what actually exists in the codebase today.

---

## 🧱 Tech Stack (Current)

- Monorepo: **Nx**
- Frontend: **Angular 22** (standalone components, zoneless change detection,
  signals, `httpResource` for data fetching)
- Backend: **NestJS 11** on **Fastify**
- Database: **PostgreSQL**
- ORM: **Drizzle**
- Validation + Types: **Zod (shared schemas)**
- Charts: **ApexCharts** (via `ng-apexcharts`)
- Auth: OAuth (GitHub, GitLab, Bitbucket) issuing our own JWT
- Front-end response cache: an in-memory `HttpInterceptor` (`HttpCacheService`)
  caches GET responses for a short TTL, keyed by full URL, and clears on any
  mutation or logout — cuts down on duplicate fetches (e.g. `GET
  /repos/tracked` firing again every time the router recreates a sidenav
  page).
- Backend commit cache: a Postgres table (`repo_commits`), not Redis — see
  Database Module. Both this and the front-end response cache above share
  one TTL constant, `COMMIT_CACHE_TTL_MS` (10 minutes) in `@org/helpers`,
  so they can't independently drift out of sync with each other.

### Not yet implemented (see Future Enhancements)

Redis, background queue (BullMQ), webhooks, AI (OpenAI API), Slack
integration. Nothing in `package.json` currently depends on any of these —
they're aspirational, not partially-built. (GitHub response caching itself
*is* built now, just on Postgres — see above — not Redis as originally
planned.)

---

## 🏗️ Nx Workspace Structure (Actual)

```
apps/
  front-end/                 (Angular app)
    src/app/
      common/
        data.ts               (shared static data: colors, date-range options)
        chart-config.ts        (dashboard's static ApexCharts config: base
                                chart/axis styles, stacked-bar-chart config,
                                calendar-heatmap layout and color scale)
      core/
        services/            (AuthService, ReposService, HttpCacheService)
        guards/               (authGuard, hasTrackedReposGuard)
        interceptors/         (authInterceptor, cacheInterceptor)
        auth.storage.ts
      layout/app-shell/      (sidenav + topbar shell for authenticated routes)
      pages/
        login/ auth-callback/ select-repos/
        dashboard/ repos-list/ repo-detail/ settings/

  api/                        (NestJS + Fastify backend, package name @org/api)
    src/app/
      app.module.ts / app.controller.ts / app.service.ts
      common/pipes/zod-validation.pipe.ts
      modules/
        auth/                (OAuth for GitHub/GitLab/Bitbucket, JWT issuing)
        repos/                (GitHub repo listing, tracked-repo CRUD, commit aggregation)
        database/            (Drizzle schema + DRIZZLE provider)

libs/
  shared/
    zod-schemas/             (source of truth for API contracts)
    types/                    (zod-inferred types + hand-written shared FE types)
    helpers/                  (framework-agnostic pure helper functions)
  ui/                         (shared Angular UI components: Button,
                                ButtonGroup, Checkbox, Dialog, InputField,
                                RadioGroup, Select, Skeleton, Spinner, Toggle)
```

Note: the original plan called for separate `libs/github`, `libs/analytics`,
`libs/ai`, `libs/slack` domain libs. None of those exist — GitHub/repo logic
currently lives directly in `apps/api/src/app/modules/repos` and
`apps/api/src/app/modules/auth` rather than as standalone libs. Revisit this
if/when analytics or AI logic grows large enough to warrant extraction.

---

## 🧠 Core Principle: Single Source of Truth

👉 API contracts are defined once in `libs/shared/zod-schemas` and consumed
from both sides via `libs/shared/types` (which re-exports `z.infer<...>` for
every schema):

- Backend validates request bodies with a `ZodValidationPipe` bound at the
  **parameter** level (`@Body(new ZodValidationPipe(Schema)) body: Type`) —
  binding it at the method level instead breaks routes with more than one
  parameter, since it would validate every argument against the same schema.
- Frontend consumes the same inferred types with no separate DTOs.

Two more shared libs extend this "don't duplicate it" principle beyond API
contracts:

- **`@org/types`** also holds hand-written frontend-only types (e.g.
  `DateRangeKey`, `ActivitySeries`) that aren't derived from a Zod schema,
  so a type only needs defining once even when it isn't part of the API.
- **`@org/helpers`** holds pure, framework-free utility functions (date
  bucketing, HTTP error-message extraction) that both apps could use, so
  common logic doesn't need reimplementing per app or duplicated between
  components.

### Frontend/backend folder conventions

- Frontend services live in `apps/front-end/src/app/core/services/`
  (mirrors `core/guards/` and `core/interceptors/` — group by kind).
- Backend feature modules live in `apps/api/src/app/modules/<name>/`
  (controller + service + module + anything module-private); cross-cutting
  pieces (validation pipes, etc.) stay in `apps/api/src/app/common/`.
- Static, non-reactive chart config (colors, sizes, ApexCharts option
  objects) lives in `apps/front-end/src/app/common/`, not inlined in the
  component - `dashboard.ts` imports its chart config from
  `common/chart-config.ts` rather than declaring it as module-level consts.

### `libs/ui` component conventions

- `InputField`, `Checkbox`, and `RadioGroup` implement Angular Signal Forms'
  `FormValueControl`/`FormCheckboxControl` (label, hint, required, invalid,
  touched, errors) - these are real, validated form fields.
- `ButtonGroup` and `Select` are deliberately simpler: an `options` input
  plus a two-way `value` model, no validation trappings. They're for
  unvalidated UI state (view toggles, filter dropdowns), not form fields -
  don't upgrade them to `FormValueControl` unless an actual form needs one.
- A component's own `class` input (see `Button`) is how a consumer appends
  extra Tailwind classes; bind it with `[class]="'...'"` (property binding),
  not a plain `class="..."` attribute, since a component input named `class`
  only receives bound values, not static attribute text.

---

## 🔌 Backend Usage (NestJS)

```ts
// apps/api/src/app/modules/repos/repos.controller.ts
@Put('tracked')
setTracked(
  @CurrentUser() user: AuthenticatedUser,
  @Body(new ZodValidationPipe(SetTrackedReposRequestSchema))
  body: SetTrackedReposRequest,
) {
  return this.reposService.setTrackedRepos(user.sub, body.repos);
}
```

## 🎨 Frontend Usage (Angular)

```ts
// apps/front-end/src/app/core/services/repos.service.ts
trackedRepos() {
  return httpResource<TrackedRepo[]>(() => '/api/repos/tracked', {
    defaultValue: [],
  });
}
```

`httpResource` (not a manual `signal` + `try/catch`) is the standard pattern
for GET requests bound to a view — it gives `.value()`/`.isLoading()`/
`.error()` for free and re-fetches reactively when its dependencies change.
One-shot imperative actions (login redirect, route guards, mutations like
`PUT /repos/tracked`) stay on plain `HttpClient` calls instead, since
`httpResource` fits reactive reads, not one-off actions.

---

## 📊 Metrics Currently Computed

All computed client-side on the dashboard from `GET /api/repos/commits`
(which the backend now serves from its own Postgres commit cache — see
Database Module — re-syncing a given repo from GitHub only once its cache
entry is older than `COMMIT_CACHE_TTL_MS`, not on every request):

- **Total contributions** — commit count for the selected date range / repo
  / contributor filter combination
- **Contributions over time** — bucketed by day, week, or month depending on
  the selected range, stacked by contributor. Has a **Bars / Heatmap**
  toggle: the heatmap is a GitHub-style contribution calendar (7 weekday
  rows x one column per week) that always spans a full year regardless of
  the selected filter, with days outside the current filter shown in a
  distinct dimmed "disabled" state rather than looking like a real 0-commit
  day.
- **Contributions by repo** — stacked by contributor
- **Top contributors** — stacked by repo

Classic engineering-metrics (Lead Time, Code Churn, PR Review Time) from the
original plan are **not implemented** — there's no PR/review data ingestion
yet, only commit data fetched on demand.

---

## 🧩 Modules (Actual)

### Backend: Auth Module (`apps/api/src/app/modules/auth`)

- OAuth authorize/callback flow for GitHub, GitLab, Bitbucket
- Issues our own JWT after linking/creating a `users` row and a
  `user_identities` row (which also stores the provider access token,
  plaintext — flagged in code as needing encryption before production)
- `GET /auth/me`, `GET /auth/identities`

### Backend: Repos Module (`apps/api/src/app/modules/repos`)

- `GET /repos/available` — the signed-in user's live GitHub repo list.
  Every call **upserts** the listing into `tracked_repos` (matched on
  `userId` + `provider` + `providerRepoId`), so metadata for repos the
  user hasn't tracked yet is persisted too, not just fetched-and-discarded.
  The upsert never touches `tracked_at` — tracking state is only ever
  changed by the endpoints below. Response includes `repoId` (that row's
  internal id, always present) and `trackedId` (same id, but only if
  `tracked_at` is set — `null` otherwise).
- `GET /repos/tracked` — only rows with `tracked_at` set.
- `PUT /repos/tracked` — replace the full tracked set in one call (bulk
  onboarding selection); untracks anything not in the new set rather than
  deleting rows.
- `PUT /repos/tracked/:id` — track a single repo by its internal id
  (idempotent; sets `tracked_at = now()`).
- `DELETE /repos/tracked/:id` — untrack a single repo. Nulls `tracked_at`
  rather than deleting the row, so its cached metadata survives being
  untracked and doesn't need re-fetching if tracked again later.
- `GET /repos/tracked/:id` — one repo's detail (tracked or not, as long as
  it's been synced via `GET /repos/available` at least once). Metadata
  only — the repo-detail page fetches commits from the endpoint below
  separately, so this doesn't sync or return any.
- `GET /repos/tracked/:id/commits?since=&until=` — commits for one repo.
  Syncs that repo's commit cache first (see Database Module) if it's
  stale, then serves from Postgres; `since`/`until` filter the cached
  rows, not a fresh GitHub call.
- `GET /repos/commits?since=&until=` — commits aggregated across every
  **tracked** repo. Syncs every stale tracked repo in parallel first (a
  single repo failing doesn't fail the whole request), then answers with
  one Postgres query across all of them instead of one GitHub call per
  repo. `since`/`until` are plain dates (`YYYY-MM-DD`) — an `until` is
  treated as inclusive through the end of that day.

### Backend: Database Module (`apps/api/src/app/modules/database`)

- Drizzle schema: `users`, `user_identities`, `tracked_repos`, `repo_commits`.
- `tracked_repos` is a **unified table**, not just "tracked" repos despite
  the name: it holds a row for every repo the user's GitHub token can see,
  once synced. `tracked_at` (nullable) is the only column tracking state —
  `null` = discovered but not tracked, set = actively tracked. `synced_at`
  records the last **metadata** refresh (name, stars, language, etc.) —
  separate from `commits_synced_at`, which tracks commit-cache freshness
  and is only ever touched by the commit sync described below.
- `repo_commits` caches each tracked repo's commit history (unique on
  `repo_id` + `sha`, indexed on `repo_id` + `committed_at`). Commits are
  immutable once made, so rows are only ever inserted
  (`onConflictDoNothing`), never updated. `ReposService.syncCommitsIfStale`
  gates every read: if a repo's `commits_synced_at` is null or older than
  `COMMIT_CACHE_TTL_MS`, it fetches from GitHub first — a never-synced
  repo gets a 300-commit backfill, an already-synced one only fetches
  what's new `since` the last sync — then serves the request from
  Postgres either way. Repeat requests inside the TTL window (switching
  date filters, revisiting a page) never touch GitHub at all.

### Frontend pages

- `login` / `auth-callback` — OAuth sign-in
- `select-repos` — first-run onboarding gate (redirected here until at
  least one repo is tracked)
- `dashboard` — stat tiles + filter bar (date range / repo / contributor,
  using `lib-ui-select`) + three stacked ApexCharts; the contribution
  activity chart has a Bars/Heatmap toggle (`lib-ui-button-group`)
- `repos-list` — table of **every** repo the user's GitHub token can see
  (not just tracked ones), with an inline `lib-ui-toggle` in a "Tracking"
  column to track/untrack a repo without leaving the page; every row links
  to `repo-detail`, tracked or not
- `repo-detail` — one repo's commits + contributor chart, and a settings
  dialog that shows a "Track" action for an untracked repo or "Untrack"
  for a tracked one
- `settings` — profile info and connected accounts only; tracked-repo
  management used to live here and was moved to `repos-list` so there's a
  single place to manage tracking

---

## ⚙️ Execution Plan

### Phase 1 – Nx Setup ✅

- ✅ Nx workspace, Angular app (`front-end`), NestJS app (`api`)
- ✅ Shared libs: `zod-schemas`, `types`, `helpers`, `ui`
- ✅ Path aliases (`@org/*`)

### Phase 2 – GitHub Integration (partial)

- ✅ OAuth setup (GitHub, GitLab, Bitbucket sign-in)
- ✅ Fetch repos (GitHub only)
- ✅ Fetch commits (GitHub only, now cached in Postgres with a TTL-gated
  re-sync rather than fetched fresh every request)
- [ ] Fetch PRs
- [ ] Webhook endpoint (everything is still pull-based, just cached now —
      new commits show up on the next sync after the cache goes stale,
      not the instant they land)
- [ ] Wire GitLab/Bitbucket repo tracking (currently sign-in only)

### Phase 3 – Analytics Engine (simplified)

- ✅ Store raw data — commits are cached server-side (`repo_commits`);
  repo/PR metadata beyond that still isn't
- ✅ Implement metrics — contribution counts/breakdowns only (see above)
- ✅ Validate using Zod schemas (request/response shapes, not metrics math)

### Phase 4 – Dashboard ✅

- ✅ Angular dashboard with sidenav shell
- ✅ Charts (ApexCharts, stacked bar charts) + filter bar
- ✅ Heatmap (GitHub-style contribution calendar, toggled per-chart)

### Phase 5 – Advanced Metrics

- [ ] PR review analytics
- [ ] Trends over longer history — the commit cache's initial backfill per
      repo is still capped at 300 commits, though it grows incrementally
      past that from there since every sync only adds what's new
- [ ] Leaderboards

### Phase 6 – Slack — not started

### Phase 7 – AI — not started

---

## 🧠 AI Agent Instructions

### Rules

1. API contracts belong in `libs/shared/zod-schemas`; consume inferred
   types from `@org/types` — don't redefine request/response shapes in
   either app.
2. Hand-written frontend-only types (not derived from a Zod schema) also go
   in `@org/types`, not inline in a component file, if they're exported/
   reused.
3. Framework-free pure helper functions go in `@org/helpers`, not
   duplicated per-component or left Angular/NestJS-coupled when they don't
   need to be.
4. Backend must validate request bodies with `ZodValidationPipe` bound at
   the **parameter** level, never the method level.
5. Frontend GET requests bound to a view use `httpResource`, not manual
   `signal` + `try/catch`. One-shot actions (mutations, login flow, route
   guards) stay on plain `HttpClient`.
6. Frontend services live in `core/services/`; backend feature modules live
   in `modules/<name>/`.
7. Follow Nx module boundaries — no reaching into another app's `src`
   directly; go through a shared lib.
8. Angular component class members are grouped by *kind*, not feature area:
   all readonly variables first (state `signal()`s, `linkedSignal()`s,
   resources, plain config references — anything that isn't a `computed()`
   call), then every `computed()`, then methods (helpers, then action/setter
   methods). Don't interleave a plain signal after a `computed()`.
9. When a change touches Angular template bindings against a typed
   third-party library (e.g. `ng-apexcharts`), verify with a real `nx build`
   (or `nx serve`), not just `nx typecheck` — `tsc --emitDeclarationOnly`
   skips Angular's template type-checking, so it can pass clean on a binding
   the real build compiler rejects, and the dev server silently keeps
   serving the last good build with no visible error.

---

## 📌 Task Tracker

### 🔹 Nx Foundation ✅

- ✅ Workspace, shared libs, path aliases

### 🔹 Auth

- ✅ OAuth (GitHub, GitLab, Bitbucket)
- ✅ JWT issuing + guards
- [ ] Encrypt `user_identities.access_token` at rest

### 🔹 Repos

- ✅ Repo fetch (GitHub)
- ✅ Tracked-repo CRUD (bulk replace + single track/untrack)
- ✅ Persist metadata for untracked repos too (unified `tracked_repos`
  table with nullable `tracked_at`), so repo detail is viewable and
  survives untracking without a GitHub re-fetch
- ✅ Commits API (per-repo + aggregated)
- ✅ Commit caching (Postgres `repo_commits`, TTL-gated re-sync instead of
  a GitHub call on every request)
- [ ] PR API
- [ ] Webhooks (currently pull-based only)
- [ ] GitLab/Bitbucket repo tracking (sign-in only today)

### 🔹 Dashboard

- ✅ Layout (sidenav shell)
- ✅ Filter bar (date range / repo / contributor)
- ✅ Charts (ApexCharts, stacked)
- ✅ Heatmap
- ✅ Front-end response cache (short-TTL, cleared on mutation/logout) —
  shares its TTL constant with the backend commit cache (`@org/helpers`)

### 🔹 AI — not started

- [ ] Schema-based responses
- [ ] Chat endpoint
- [ ] Insight generator

---

## 🚨 Notes

- Zod = contract + validation (critical) — keep it that way
- Avoid DTO duplication — use `@org/types`
- Repo **metadata** (name, stars, language, etc.) is cached server-side via
  upsert into `tracked_repos`; **commits** are now cached too
  (`repo_commits`, TTL-gated re-sync — see Database Module). What's still
  live on every call: `GET /repos/available` itself always upserts the
  current GitHub listing, unconditionally, no TTL check
- Focus on team insights, not individual surveillance

---

## 🚀 Future Enhancements

- TTL-gate `GET /repos/available`'s repo-listing upsert the same way
  commits are now cached, instead of always hitting GitHub live
- Background jobs / webhooks instead of a request-triggered cache sync
  (BullMQ) — commits only refresh when someone asks, not the instant
  they land upstream
- GitLab/Bitbucket repo tracking (beyond sign-in)
- PR review analytics, Lead Time, Code Churn, trends, leaderboards
- AI-driven insights (OpenAI API) over structured metrics
- Slack bot: notifications, slash commands
- Multi-org support
- Role-based access
- Jira integration
- Predictive analytics / burnout detection

---
