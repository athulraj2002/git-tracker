import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const authProviderEnum = pgEnum('auth_provider', [
  'github',
  'gitlab',
  'bitbucket',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    providerLogin: text('provider_login').notNull(),
    // Plaintext for now - encrypt at rest before this goes to production.
    accessToken: text('access_token'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.provider, table.providerUserId)],
);

// Holds every repo the user's GitHub token can see, not just tracked ones -
// getAvailableRepos() upserts the live GitHub listing into this table on
// every call, so repo metadata and (eventually) commit history survive
// across tracking on/off instead of being re-fetched from GitHub each time.
// `trackedAt` is the only thing tracking a repo actually changes; untracking
// nulls it out rather than deleting the row, preserving the cached metadata.
export const trackedRepos = pgTable(
  'tracked_repos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum('provider').notNull(),
    providerRepoId: text('provider_repo_id').notNull(),
    fullName: text('full_name').notNull(),
    private: boolean('private').notNull().default(false),
    htmlUrl: text('html_url').notNull(),
    description: text('description'),
    language: text('language'),
    defaultBranch: text('default_branch'),
    stars: integer('stars').notNull().default(0),
    forks: integer('forks').notNull().default(0),
    openIssues: integer('open_issues').notNull().default(0),
    // Null = discovered but not tracked. Set/cleared by tracking, never by a
    // metadata sync (getAvailableRepos must not touch this on upsert).
    trackedAt: timestamp('tracked_at', { withTimezone: true }),
    // When this row's metadata was last refreshed from GitHub.
    syncedAt: timestamp('synced_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.userId, table.provider, table.providerRepoId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserIdentity = typeof userIdentities.$inferSelect;
export type NewUserIdentity = typeof userIdentities.$inferInsert;
export type TrackedRepo = typeof trackedRepos.$inferSelect;
export type NewTrackedRepo = typeof trackedRepos.$inferInsert;
