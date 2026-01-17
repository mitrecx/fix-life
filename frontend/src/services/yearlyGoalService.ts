import api from "./api";
import type {
  YearlyGoal,
  YearlyGoalCreate,
  YearlyGoalUpdate,
  ProgressUpdate,
} from "@/types/yearlyGoal";

interface YearlyGoalListResponse {
  goals: YearlyGoal[];
  total: number;
}

export const yearlyGoalService = {
  // Get all yearly goals
  async getAll(year?: number, category?: string): Promise<YearlyGoal[]> {
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (category) params.append("category", category);

    const response: YearlyGoalListResponse = await api.get(
      `/yearly-goals/${params.toString() ? `?${params}` : ""}`
    );
    return response.goals;
  },

  // Get single goal
  async getById(id: string): Promise<YearlyGoal> {
    return await api.get(`/yearly-goals/${id}`);
  },

  // Create new goal
  async create(goal: YearlyGoalCreate): Promise<YearlyGoal> {
    return await api.post("/yearly-goals/", goal);
  },

  // Update goal
  async update(id: string, goal: YearlyGoalUpdate): Promise<YearlyGoal> {
    return await api.put(`/yearly-goals/${id}`, goal);
  },

  // Update progress
  async updateProgress(id: string, progress: ProgressUpdate): Promise<YearlyGoal> {
    return await api.patch(`/yearly-goals/${id}/progress`, progress);
  },

  // Delete goal
  async delete(id: string): Promise<void> {
    await api.delete(`/yearly-goals/${id}`);
  },
};
