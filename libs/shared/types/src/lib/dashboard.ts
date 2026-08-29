export type DateRangeKey = '7d' | '30d' | '90d' | '365d';

export interface DateRangeOption {
  key: DateRangeKey;
  label: string;
}

export interface ActivitySeries {
  name: string;
  data: number[];
}

export interface RepoContribution {
  repoId: string;
  repoFullName: string;
  count: number;
}

export interface ContributorStat {
  author: string;
  count: number;
}
