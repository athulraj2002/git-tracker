import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/api/src/app/database/schema.ts',
  out: './apps/api/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/git_tracker',
  },
});
