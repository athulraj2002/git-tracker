# 🚀 Developer Analytics Platform (GitPrime-like) – Project Plan (Nx + Zod Edition)

## 📌 Project Overview

A web application that integrates with GitHub to analyze engineering productivity, visualize team performance, detect bottlenecks, and provide AI-driven insights. Includes Slack integration and conversational AI.

---

## 🧱 Tech Stack (Updated)

- Monorepo: **Nx**
- Frontend: Angular
- Backend: NestJS
- Database: PostgreSQL
- Cache: Redis
- Queue: BullMQ
- Validation + Types: **Zod (shared schemas)**
- AI: OpenAI API
- Integrations: GitHub, Slack

---

## 🏗️ Nx Workspace Structure

```
apps/
  front-end/        (Angular app)
  api/             (NestJS backend)

libs/
  shared/
    zod-schemas/   (source of truth for API contracts)
    types/         (derived types if needed)
  github/
  analytics/
  ai/
  slack/
  ui/
```

---

## 🧠 Core Principle: Single Source of Truth

👉 All API contracts must be defined in:

```
libs/shared/zod-schemas
```

- Backend uses schemas for validation
- Frontend uses inferred types
- Eliminates DTO duplication

---

## 🧩 Zod Setup

### Example Schema

```ts
// libs/shared/zod-schemas/src/metrics.ts
import { z } from 'zod';

export const MetricsSchema = z.object({
  leadTime: z.number(),
  churn: z.number(),
  reviewers: z.number(),
});

export type Metrics = z.infer<typeof MetricsSchema>;
```

---

## 🔌 Backend Usage (NestJS)

```ts
// apps/api/src/modules/metrics.controller.ts
@Get('/metrics')
getMetrics(): Metrics {
  return this.metricsService.getMetrics();
}
```

Optional validation:

```ts
MetricsSchema.parse(data);
```

---

## 🎨 Frontend Usage (Angular)

```ts
// apps/frontend
this.http.get<Metrics>('/api/metrics');
```

---

## 📊 Metrics Definitions

- Lead Time = PR Merge Time - First Commit Time
- Code Churn = Modified Lines / Total Lines
- Active Days = Unique commit days
- PR Review Time = Review Submitted - PR Opened

---

## 🧩 Modules

### Auth Module

- GitHub OAuth login

### GitHub Module

- Repo, commits, PRs
- Webhooks

### Analytics Module

- Metrics engine
- Zod-validated outputs

### Dashboard Module

- Charts + heatmaps

### AI Module

- Uses structured schema outputs

---

## ⚙️ Execution Plan

### Phase 1 – Nx Setup

- ✅ Create Nx workspace
- ✅ Generate Angular app (`frontend`)
- ✅ Generate NestJS app (`api`)
- [ ] Create shared lib (`zod-schemas`)
- [ ] Setup path aliases

---

### Phase 2 – GitHub Integration

- [ ] OAuth setup
- [ ] Fetch repos
- [ ] Fetch commits & PRs
- [ ] Webhook endpoint

---

### Phase 3 – Analytics Engine

- [ ] Store raw data
- [ ] Implement metrics
- [ ] Validate using Zod schemas

---

### Phase 4 – Dashboard

- [ ] Angular dashboard
- [ ] Charts + heatmap

---

### Phase 5 – Advanced Metrics

- [ ] PR review analytics
- [ ] Trends
- [ ] Leaderboards

---

### Phase 6 – Slack

- [ ] Bot setup
- [ ] Notifications
- [ ] Slash commands

---

### Phase 7 – AI

- [ ] Chat endpoint
- [ ] Context retrieval
- [ ] Insights generation using structured data

---

## 🧠 AI Agent Instructions

### Rules

1. Always use Zod schemas from shared lib
2. Do not redefine types in apps
3. Backend must validate responses
4. Frontend must consume inferred types
5. Follow Nx module boundaries

---

## 📌 Task Tracker

### 🔹 Nx Foundation

- [ ] Setup workspace
- [ ] Configure shared libs
- [ ] Setup lint + boundaries

### 🔹 GitHub Module

- [ ] OAuth
- [ ] Repo fetch
- [ ] Commits API
- [ ] PR API
- [ ] Webhooks

### 🔹 Analytics

- [ ] Metrics schema
- [ ] Lead Time calc
- [ ] Churn calc
- [ ] Active Days

### 🔹 Dashboard

- [ ] Layout
- [ ] Charts
- [ ] Heatmap

### 🔹 AI

- [ ] Schema-based responses
- [ ] Chat endpoint
- [ ] Insight generator

---

## 🚨 Notes

- Zod = contract + validation (critical)
- Avoid DTO duplication
- Use webhooks over polling
- Cache GitHub data
- Focus on team insights, not individual surveillance

---

## 🚀 Future Enhancements

- Multi-org support
- Role-based access
- Jira integration
- Predictive analytics
- Burnout detection

---
