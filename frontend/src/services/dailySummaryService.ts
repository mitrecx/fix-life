import api from "./api";
import type {
  DailySummary,
  DailySummaryCreate,
  DailySummaryUpdate,
} from "@/types/dailySummary";

class DailySummaryService {
  private baseUrl = "/daily-summaries";

  async getByPlanId(planId: string): Promise<DailySummary> {
    return await api.get<DailySummary>(`${this.baseUrl}/plans/${planId}/summary`);
  }

  async create(planId: string, data: DailySummaryCreate): Promise<DailySummary> {
    return await api.post<DailySummary>(`${this.baseUrl}/plans/${planId}/summary`, data);
  }

  async update(summaryId: string, data: DailySummaryUpdate): Promise<DailySummary> {
    return await api.put<DailySummary>(`${this.baseUrl}/summaries/${summaryId}`, data);
  }

  async delete(summaryId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/summaries/${summaryId}`);
  }

  async getSummaryTypes(): Promise<Record<string, string>> {
    return await api.get<Record<string, string>>(`${this.baseUrl}/summary-types`);
  }
}

export const dailySummaryService = new DailySummaryService();
