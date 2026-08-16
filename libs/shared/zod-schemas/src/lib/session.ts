import { z } from 'zod';

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
});

export const ConnectedIdentitySchema = z.object({
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
  providerLogin: z.string(),
  createdAt: z.string().datetime(),
});
