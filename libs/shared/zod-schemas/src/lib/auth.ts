import { z } from 'zod';

export const GithubUserSchema = z.object({
  id: z.number().int(),
  login: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url(),
  htmlUrl: z.string().url(),
});

export const GitlabUserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url().nullable(),
  webUrl: z.string().url(),
});

export const BitbucketUserSchema = z.object({
  accountId: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url(),
});

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  scope: z.string(),
});

export const AuthSessionSchema = z.object({
  user: GithubUserSchema,
  accessToken: z.string(),
  expiresAt: z.string().datetime().nullable(),
});

export const OAuthCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});
