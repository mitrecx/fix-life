import api from "./api";
import type {
  WeeklySummary,
  WeeklySummaryCreate,
  WeeklySummaryUpdate,
  WeeklySummaryListResponse,
  WeeklySummaryGenerateRequest,
} from "@/types/weeklySummary";

class WeeklySummaryService {
  private baseUrl = "/weekly-summaries";

  async getAll(params?: {
    year?: number;
    skip?: number;
    limit?: number;
  }): Promise<WeeklySummaryListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.skip !== undefined) queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());

    const queryString = queryParams.toString();
    return await api.get<WeeklySummaryListResponse>(
      queryString ? `${this.baseUrl}/?${queryString}` : this.baseUrl
    );
  }

  async getById(summaryId: string): Promise<WeeklySummary> {
    return await api.get<WeeklySummary>(`${this.baseUrl}/${summaryId}`);
  }

  async create(data: WeeklySummaryCreate): Promise<WeeklySummary> {
    return await api.post<WeeklySummary>(this.baseUrl, data);
  }

  async generate(data: WeeklySummaryGenerateRequest): Promise<WeeklySummary> {
    return await api.post<WeeklySummary>(`${this.baseUrl}/generate`, data);
  }

  async update(summaryId: string, data: WeeklySummaryUpdate): Promise<WeeklySummary> {
    return await api.put<WeeklySummary>(`${this.baseUrl}/${summaryId}`, data);
  }

  async delete(summaryId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${summaryId}`);
  }

  async sendNotification(
    summaryId: string,
    sendEmail: boolean,
    sendFeishu: boolean
  ): Promise<any> {
    const params = new URLSearchParams();
    if (sendEmail) params.append("send_email", "true");
    if (sendFeishu) params.append("send_feishu", "true");

    return await api.post(
      `${this.baseUrl}/${summaryId}/send?${params.toString()}`
    );
  }
}

export const weeklySummaryService = new WeeklySummaryService();
