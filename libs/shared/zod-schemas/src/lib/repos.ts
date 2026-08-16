import { z } from 'zod';

export const SelectedRepoSchema = z.object({
  id: z.number().int(),
  fullName: z.string(),
  private: z.boolean(),
  htmlUrl: z.string().url(),
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
  createdAt: z.string().datetime(),
});
