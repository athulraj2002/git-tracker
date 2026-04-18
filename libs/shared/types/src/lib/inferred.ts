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
  AuthTokenSchema,
  AuthSessionSchema,
  OAuthCallbackQuerySchema,
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
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;
