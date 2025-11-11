export interface ProjectCountSummary {
  projects: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  unassigned: number;
  total: number;
}
