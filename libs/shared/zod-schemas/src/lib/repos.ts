import { z } from 'zod';
import { GithubRepoSchema } from './github';

export const SelectedRepoSchema = z.object({
  id: z.number().int(),
  fullName: z.string(),
  private: z.boolean(),
  htmlUrl: z.string().url(),
  description: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  defaultBranch: z.string().nullable().optional(),
  stars: z.number().int().min(0).optional(),
  forks: z.number().int().min(0).optional(),
  openIssues: z.number().int().min(0).optional(),
});

export const SetTrackedReposRequestSchema = z.object({
  repos: z.array(SelectedRepoSchema),
});

export const TrackedRepoSchema = z.object({
  id: z.string().uuid(),
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
  providerRepoId: z.string(),
  fullName: z.string(),
  private: z.boolean(),
  htmlUrl: z.string().url(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  defaultBranch: z.string().nullable(),
  stars: z.number().int().min(0),
  forks: z.number().int().min(0),
  openIssues: z.number().int().min(0),
  // Null if this repo was only ever synced from GET /repos/available and
  // never actually tracked.
  trackedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

// GET /repos/available's response shape: the live GitHub listing, enriched
// with whether (and under what internal id) each repo is already tracked -
// `id` here is still GitHub's own numeric repo id, unlike TrackedRepoSchema.
export const AvailableRepoSchema = GithubRepoSchema.extend({
  // Internal repos-table id, always present - every repo the user's GitHub
  // token can see gets a row on sync, so this is what detail/commit routes
  // should link to even when the repo isn't tracked.
  repoId: z.string().uuid(),
  trackedId: z.string().uuid().nullable(),
});

export const RepoCommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  authorLogin: z.string().nullable(),
  authorAvatarUrl: z.string().url().nullable(),
  committedAt: z.string().datetime(),
  htmlUrl: z.string().url(),
});

export const RepoDetailResponseSchema = z.object({
  repo: TrackedRepoSchema,
  commits: z.array(RepoCommitSchema),
});

export const RepoCommitWithContextSchema = RepoCommitSchema.extend({
  repoId: z.string().uuid(),
  repoFullName: z.string(),
});
