import type { z } from 'zod';
import type {
  MetricsSchema,
  LeadTimeSchema,
  CodeChurnSchema,
  ActiveDaysSchema,
  PrReviewTimeSchema,
  TeamMetricsSummarySchema,
  GithubRepoSchema,
  GithubCommitSchema,
  GithubPullRequestSchema,
  GithubWebhookPayloadSchema,
  FetchReposResponseSchema,
  GithubUserSchema,
  GitlabUserSchema,
  BitbucketUserSchema,
  AuthTokenSchema,
  AuthSessionSchema,
  OAuthCallbackQuerySchema,
  AuthUserSchema,
  AuthResponseSchema,
  ConnectedIdentitySchema,
  SelectedRepoSchema,
  SetTrackedReposRequestSchema,
  TrackedRepoSchema,
  AvailableRepoSchema,
  RepoCommitSchema,
  RepoDetailResponseSchema,
  RepoCommitWithContextSchema,
} from '@org/zod-schemas';

export type Metrics = z.infer<typeof MetricsSchema>;
export type LeadTime = z.infer<typeof LeadTimeSchema>;
export type CodeChurn = z.infer<typeof CodeChurnSchema>;
export type ActiveDays = z.infer<typeof ActiveDaysSchema>;
export type PrReviewTime = z.infer<typeof PrReviewTimeSchema>;
export type TeamMetricsSummary = z.infer<typeof TeamMetricsSummarySchema>;

export type GithubRepo = z.infer<typeof GithubRepoSchema>;
export type GithubCommit = z.infer<typeof GithubCommitSchema>;
export type GithubPullRequest = z.infer<typeof GithubPullRequestSchema>;
export type GithubWebhookPayload = z.infer<typeof GithubWebhookPayloadSchema>;
export type FetchReposResponse = z.infer<typeof FetchReposResponseSchema>;

export type GithubUser = z.infer<typeof GithubUserSchema>;
export type GitlabUser = z.infer<typeof GitlabUserSchema>;
export type BitbucketUser = z.infer<typeof BitbucketUserSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ConnectedIdentity = z.infer<typeof ConnectedIdentitySchema>;

export type SelectedRepo = z.infer<typeof SelectedRepoSchema>;
export type SetTrackedReposRequest = z.infer<typeof SetTrackedReposRequestSchema>;
export type TrackedRepo = z.infer<typeof TrackedRepoSchema>;
export type AvailableRepo = z.infer<typeof AvailableRepoSchema>;
export type RepoCommit = z.infer<typeof RepoCommitSchema>;
export type RepoDetailResponse = z.infer<typeof RepoDetailResponseSchema>;
export type RepoCommitWithContext = z.infer<typeof RepoCommitWithContextSchema>;
