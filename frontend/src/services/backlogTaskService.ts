import api from "./api";
import type {
  BacklogTask,
  BacklogTaskCreate,
  BacklogTaskUpdate,
  BacklogTab,
  BacklogContextFilter,
  BacklogListFilters,
  BacklogDatePreset,
  BacklogTimeField,
} from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";
import dayjs from "dayjs";

interface BacklogTaskListResponse {
  tasks: BacklogTask[];
  total: number;
}

class BacklogTaskService {
  private baseUrl = "/backlog-tasks";

  resolveDateRange(filters: BacklogListFilters): { dateFrom?: string; dateTo?: string } {
    const preset = filters.datePreset ?? "all";
    const today = dayjs().format("YYYY-MM-DD");

    if (preset === "all") {
      return {};
    }
    if (preset === "today") {
      return { dateFrom: today, dateTo: today };
    }
    if (preset === "7d") {
      return { dateFrom: dayjs().subtract(6, "day").format("YYYY-MM-DD"), dateTo: today };
    }
    if (preset === "30d") {
      return { dateFrom: dayjs().subtract(29, "day").format("YYYY-MM-DD"), dateTo: today };
    }
    return {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    };
  }

  buildListParams(tab: BacklogTab, filters: BacklogListFilters = {}): URLSearchParams {
    const params = new URLSearchParams({ tab });

    const context = this.contextFilterToParam(filters.context ?? "all");
    if (context) params.append("context", context);

    const q = filters.q?.trim();
    if (q) params.append("q", q);

    const preset = filters.datePreset ?? "all";
    if (preset !== "all") {
      const timeField = filters.timeField ?? "created";
      params.append("time_field", timeField);
      const { dateFrom, dateTo } = this.resolveDateRange(filters);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
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

  parseDatePreset(value: string | null): BacklogDatePreset {
    if (value === "today" || value === "7d" || value === "30d" || value === "custom") return value;
    return "all";
  }
}

export const backlogTaskService = new BacklogTaskService();
