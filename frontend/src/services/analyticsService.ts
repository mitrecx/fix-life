import api from "./api";
import type {
  DashboardStats,
  YearlyStats,
  MonthlyStats,
  CompletionRateTrend,
  HeatmapData,
} from "@/types/analytics";

class AnalyticsService {
  private baseUrl = "/analytics";

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return await api.get<DashboardStats>(`${this.baseUrl}/dashboard`);
  }

  /**
   * Get yearly statistics
   */
  async getYearlyStats(year: number): Promise<YearlyStats> {
    return await api.get<YearlyStats>(`${this.baseUrl}/yearly/${year}`);
  }

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    return await api.get<MonthlyStats>(
      `${this.baseUrl}/monthly/${year}/${month}`
    );
  }

  /**
   * Get completion rate trend
   */
  async getCompletionRateTrend(
    period: "daily" | "weekly" | "monthly" = "daily",
    startDate?: string,
    endDate?: string,
    days?: number
  ): Promise<CompletionRateTrend> {
    const params = new URLSearchParams();
    params.append("period", period);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (days) params.append("days", days.toString());

    return await api.get<CompletionRateTrend>(
      `${this.baseUrl}/completion-rate?${params.toString()}`
    );
  }

  /**
   * Get heatmap data
   */
  async getHeatmapData(
    startDate?: string,
    endDate?: string,
    days?: number
  ): Promise<HeatmapData> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (days) params.append("days", days.toString());

    return await api.get<HeatmapData>(
      `${this.baseUrl}/heatmap?${params.toString()}`
    );
  }
}

export const analyticsService = new AnalyticsService();
