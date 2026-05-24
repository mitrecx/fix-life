import api from "./api";
import type {
  BacklogTask,
  BacklogTaskCreate,
  BacklogTaskUpdate,
  BacklogTab,
  BacklogContextFilter,
  BacklogListFilters,
  BacklogTimeField,
} from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";

interface BacklogTaskListResponse {
  tasks: BacklogTask[];
  total: number;
}

class BacklogTaskService {
  private baseUrl = "/backlog-tasks";

  hasTimeRangeFilter(filters: BacklogListFilters): boolean {
    return !!(filters.dateFrom || filters.dateTo);
  }

  buildListParams(tab: BacklogTab, filters: BacklogListFilters = {}): URLSearchParams {
    const params = new URLSearchParams({ tab });

    const context = this.contextFilterToParam(filters.context ?? "all");
    if (context) params.append("context", context);

    const q = filters.q?.trim();
    if (q) params.append("q", q);

    if (this.hasTimeRangeFilter(filters)) {
      params.append("time_field", filters.timeField ?? "created");
      if (filters.dateFrom) params.append("date_from", filters.dateFrom);
      if (filters.dateTo) params.append("date_to", filters.dateTo);
    }

    return params;
  }

  async list(tab: BacklogTab = "active", filters: BacklogListFilters = {}): Promise<BacklogTask[]> {
    const params = this.buildListParams(tab, filters);
    const response = await api.get<BacklogTaskListResponse>(
      `${this.baseUrl}/?${params.toString()}`
    );
    return response.tasks;
  }

  async create(data: BacklogTaskCreate): Promise<BacklogTask> {
    return await api.post<BacklogTask>(`${this.baseUrl}/`, data);
  }

  async update(id: string, data: BacklogTaskUpdate): Promise<BacklogTask> {
    return await api.put<BacklogTask>(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async complete(id: string): Promise<BacklogTask> {
    return await api.post<BacklogTask>(`${this.baseUrl}/${id}/complete`);
  }

  async schedule(id: string, planDate: string): Promise<BacklogTask> {
    return await api.post<BacklogTask>(`${this.baseUrl}/${id}/schedule`, {
      plan_date: planDate,
    });
  }

  async revertToInbox(id: string): Promise<BacklogTask> {
    return await api.post<BacklogTask>(`${this.baseUrl}/${id}/revert`);
  }

  contextFilterToParam(filter: BacklogContextFilter): TaskContext | undefined {
    return filter === "all" ? undefined : filter;
  }

  parseTimeField(value: string | null): BacklogTimeField {
    if (value === "scheduled" || value === "completed") return value;
    return "created";
  }
}

export const backlogTaskService = new BacklogTaskService();
