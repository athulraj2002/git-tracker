import { z } from 'zod';

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
});
