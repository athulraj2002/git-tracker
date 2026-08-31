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
