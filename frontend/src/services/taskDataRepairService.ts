import api from "./api";
import type { BacklogTask } from "@/types/backlogTask";

export interface OrphanDailyItem {
  daily_task_id: string;
  daily_progress_day_id: string;
  /** @deprecated use daily_progress_day_id */
  daily_plan_id?: string;
  plan_date: string;
  title: string;
  daily_status: string;
  suggested_action: "link_existing" | "create_backlog";
}

export interface DuplicateBacklogGroup {
  normalized_title: string;
  plan_date: string;
  backlog_ids: string[];
  suggested_keep_id: string;
}

export interface FuzzyDuplicatePair {
  backlog_id_a: string;
  backlog_id_b: string;
  title: string;
  days_apart: number;
}

export interface DataRepairPreview {
  orphan_daily_count: number;
  orphan_samples: OrphanDailyItem[];
  duplicate_groups: DuplicateBacklogGroup[];
  fuzzy_duplicate_pairs: FuzzyDuplicatePair[];
  would_link_existing: number;
  would_create_backlog: number;
  would_merge_backlogs: number;
  would_delete_duplicate_dailies: number;
}

export interface DataRepairRunResult {
  dry_run: boolean;
  linked_existing: number;
  created_backlog: number;
  merged_backlogs: number;
  deleted_duplicate_dailies: number;
  skipped: number;
}

class TaskDataRepairService {
  private baseUrl = "/backlog-tasks/data-repair";

  async preview(): Promise<DataRepairPreview> {
    return await api.get<DataRepairPreview>(`${this.baseUrl}/preview`);
  }

  async run(dryRun = false): Promise<DataRepairRunResult> {
    return await api.post<DataRepairRunResult>(`${this.baseUrl}/run`, { dry_run: dryRun });
  }

  async merge(keeperId: string, mergeId: string): Promise<BacklogTask> {
    return await api.post<BacklogTask>(`${this.baseUrl}/merge`, {
      keeper_id: keeperId,
      merge_id: mergeId,
    });
  }
}

export const taskDataRepairService = new TaskDataRepairService();
