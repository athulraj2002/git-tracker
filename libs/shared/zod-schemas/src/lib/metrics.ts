import { z } from 'zod';

export const MetricsSchema = z.object({
  leadTime: z
    .number()
    .describe('PR merge time minus first commit time in hours'),
  codeChurn: z
    .number()
    .min(0)
    .max(1)
    .describe('Modified lines divided by total lines'),
  activeDays: z
    .number()
    .int()
    .min(0)
    .describe('Unique commit days in the period'),
  prReviewTime: z
    .number()
    .describe('Time from PR opened to review submitted in hours'),
});

export const LeadTimeSchema = z.object({
  repositoryId: z.string(),
  authorLogin: z.string(),
  prNumber: z.number().int(),
  firstCommitAt: z.string().datetime(),
  mergedAt: z.string().datetime(),
  leadTimeHours: z.number(),
});

export const CodeChurnSchema = z.object({
  repositoryId: z.string(),
  authorLogin: z.string(),
  period: z.string(),
  modifiedLines: z.number().int(),
  totalLines: z.number().int(),
  churnRate: z.number().min(0).max(1),
});

export const ActiveDaysSchema = z.object({
  authorLogin: z.string(),
  period: z.string(),
  activeDays: z.number().int().min(0),
  totalDays: z.number().int().min(0),
});

export const PrReviewTimeSchema = z.object({
  repositoryId: z.string(),
  prNumber: z.number().int(),
  authorLogin: z.string(),
  openedAt: z.string().datetime(),
  firstReviewAt: z.string().datetime().nullable(),
  reviewTimeHours: z.number().nullable(),
});

export const TeamMetricsSummarySchema = z.object({
  period: z.string(),
  repositoryIds: z.array(z.string()),
  avgLeadTimeHours: z.number(),
  avgCodeChurn: z.number(),
  totalActiveDays: z.number().int(),
  avgPrReviewTimeHours: z.number(),
});
