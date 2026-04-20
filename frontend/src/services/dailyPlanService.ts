import api, { rawApi } from "./api";
import type {
  DailyPlan,
  DailyPlanCreate,
  DailyPlanUpdate,
  DailyTask,
  DailyTaskCreate,
  DailyTaskUpdate,
  DailyTaskStatus,
  DailyPlanHead,
} from "@/types/dailyPlan";

interface DailyPlanListResponse {
  plans: DailyPlan[];
  total: number;
}

class DailyPlanService {
  private baseUrl = "/daily-plans";

  async getAll(startDate?: string, endDate?: string): Promise<DailyPlan[]> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const response = await api.get<DailyPlanListResponse>(
      `${this.baseUrl}/${params.toString() ? `?${params.toString()}` : ""}`
    );
    return response.plans;
  }

  /** No nested tasks; 404 → null */
  async getPlanHeadByDate(planDate: string): Promise<DailyPlanHead | null> {
    const res = await rawApi.get<DailyPlanHead>(`${this.baseUrl}/by-date/${planDate}`, {
      validateStatus: (s) => s === 200 || s === 404,
    });
    if (res.status === 404) return null;
    return res.data;
  }

  async getById(id: string): Promise<DailyPlan> {
    return await api.get<DailyPlan>(`${this.baseUrl}/${id}`);
  }

  async create(data: DailyPlanCreate): Promise<{ plan: DailyPlan; created: boolean }> {
    const res = await rawApi.post<DailyPlan>(`${this.baseUrl}/`, data, {
      validateStatus: (s) => s === 200 || s === 201,
    });
    return { plan: res.data, created: res.status === 201 };
  }

  async update(id: string, data: DailyPlanUpdate): Promise<DailyPlan> {
    return await api.put<DailyPlan>(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // Task methods
  async getTasks(planId: string): Promise<DailyTask[]> {
    return await api.get<DailyTask[]>(`${this.baseUrl}/${planId}/tasks`);
  }

  async createTask(planId: string, data: DailyTaskCreate): Promise<DailyTask> {
    return await api.post<DailyTask>(`${this.baseUrl}/${planId}/tasks`, data);
  }

  async updateTask(taskId: string, data: DailyTaskUpdate): Promise<DailyTask> {
    return await api.put<DailyTask>(`${this.baseUrl}/tasks/${taskId}`, data);
  }

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/tasks/${taskId}`);
  }

  async updateTaskStatus(taskId: string, status: DailyTaskStatus): Promise<DailyTask> {
    return await api.patch<DailyTask>(`${this.baseUrl}/tasks/${taskId}/status`, { status });
  }
}

export const dailyPlanService = new DailyPlanService();
