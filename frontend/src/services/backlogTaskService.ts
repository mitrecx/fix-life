import api from "./api";
import type {
  BacklogTask,
  BacklogTaskCreate,
  BacklogTaskUpdate,
  BacklogTab,
  BacklogContextFilter,
} from "@/types/backlogTask";
import type { TaskContext } from "@/types/taskContext";

interface BacklogTaskListResponse {
  tasks: BacklogTask[];
  total: number;
}

class BacklogTaskService {
  private baseUrl = "/backlog-tasks";

  async list(tab: BacklogTab = "active", context?: TaskContext): Promise<BacklogTask[]> {
    const params = new URLSearchParams({ tab });
    if (context) params.append("context", context);

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
}

export const backlogTaskService = new BacklogTaskService();
