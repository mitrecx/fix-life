import api from "./api";
import type {
  MonthlyPlan,
  MonthlyPlanCreate,
  MonthlyPlanUpdate,
  MonthlyTask,
  MonthlyTaskCreate,
  MonthlyTaskUpdate,
  TaskStatus,
} from "@/types/monthlyPlan";

interface MonthlyPlanListResponse {
  plans: MonthlyPlan[];
  total: number;
}

export const monthlyPlanService = {
  // Get all monthly plans
  async getAll(year?: number, month?: number): Promise<MonthlyPlan[]> {
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (month) params.append("month", month.toString());

    const response: MonthlyPlanListResponse = await api.get(
      `/monthly-plans/${params.toString() ? `?${params}` : ""}`
    );
    return response.plans;
  },

  // Get single plan
  async getById(id: string): Promise<MonthlyPlan> {
    return await api.get(`/monthly-plans/${id}`);
  },

  // Create new plan
  async create(plan: MonthlyPlanCreate): Promise<MonthlyPlan> {
    return await api.post("/monthly-plans/", plan);
  },

  // Update plan
  async update(id: string, plan: MonthlyPlanUpdate): Promise<MonthlyPlan> {
    return await api.put(`/monthly-plans/${id}`, plan);
  },

  // Delete plan
  async delete(id: string): Promise<void> {
    await api.delete(`/monthly-plans/${id}`);
  },

  // ===== Task Methods =====

  // Get tasks for a plan
  async getTasks(planId: string): Promise<MonthlyTask[]> {
    return await api.get(`/monthly-plans/${planId}/tasks`);
  },

  // Create task
  async createTask(planId: string, task: MonthlyTaskCreate): Promise<MonthlyTask> {
    return await api.post(`/monthly-plans/${planId}/tasks`, task);
  },

  // Update task
  async updateTask(taskId: string, task: MonthlyTaskUpdate): Promise<MonthlyTask> {
    return await api.put(`/monthly-plans/tasks/${taskId}`, task);
  },

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/monthly-plans/tasks/${taskId}`);
  },

  // Update task status
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<MonthlyTask> {
    return await api.patch(`/monthly-plans/tasks/${taskId}/status`, { status });
  },
};
