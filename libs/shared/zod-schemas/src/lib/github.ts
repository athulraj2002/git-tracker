import { z } from 'zod';

export const GithubRepoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  fullName: z.string(),
  private: z.boolean(),
  defaultBranch: z.string(),
  language: z.string().nullable(),
  description: z.string().nullable(),
  htmlUrl: z.string().url(),
  cloneUrl: z.string().url(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GithubCommitSchema = z.object({
  sha: z.string(),
  repositoryId: z.string(),
  authorLogin: z.string().nullable(),
  authorEmail: z.string().email().nullable(),
  message: z.string(),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0),
  committedAt: z.string().datetime(),
  htmlUrl: z.string().url(),
});

export const GithubPullRequestSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  repositoryId: z.string(),
  title: z.string(),
  state: z.enum(['open', 'closed', 'merged']),
  authorLogin: z.string(),
  reviewers: z.array(z.string()),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0),
  changedFiles: z.number().int().min(0),
  openedAt: z.string().datetime(),
  mergedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  htmlUrl: z.string().url(),
});

export const GithubWebhookPayloadSchema = z.object({
  action: z.string(),
  repository: GithubRepoSchema,
  sender: z.object({
    login: z.string(),
    id: z.number().int(),
  }),
});

export const FetchReposResponseSchema = z.object({
  repos: z.array(GithubRepoSchema),
  total: z.number().int(),
});
