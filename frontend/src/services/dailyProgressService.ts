import api, { rawApi } from "./api";
import type {
  DailyProgressDay,
  DailyProgressDayCreate,
  DailyProgressDayUpdate,
  DailyProgressEntry,
  DailyProgressEntryAdd,
  DailyProgressEntryUpdate,
  DailyProgressEntryStatus,
  DailyProgressDayHead,
} from "@/types/dailyProgress";
import type { TaskContext } from "@/types/taskContext";

export type DailyProgressContextFilter = TaskContext | "all";

interface DailyProgressListResponse {
  daily_progress_days: DailyProgressDay[];
  total: number;
}

export class DailyProgressService {
  private baseUrl = "/daily-progress";

  async getAll(
    startDate?: string,
    endDate?: string,
    context: DailyProgressContextFilter = "all",
  ): Promise<DailyProgressDay[]> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (context !== "all") params.append("context", context);

    const response = await api.get<DailyProgressListResponse>(
      `${this.baseUrl}/${params.toString() ? `?${params.toString()}` : ""}`,
    );
    return response.daily_progress_days;
  }

  /** No nested entries; 404 → null */
  async getDayHeadByDate(progressDate: string): Promise<DailyProgressDayHead | null> {
    const res = await rawApi.get<DailyProgressDayHead>(`${this.baseUrl}/by-date/${progressDate}`, {
      validateStatus: (s) => s === 200 || s === 404,
    });
    if (res.status === 404) return null;
    return res.data;
  }

  async getById(id: string): Promise<DailyProgressDay> {
    return await api.get<DailyProgressDay>(`${this.baseUrl}/${id}`);
  }

  async create(
    data: DailyProgressDayCreate,
  ): Promise<{ day: DailyProgressDay; created: boolean }> {
    const res = await rawApi.post<DailyProgressDay>(`${this.baseUrl}/`, data, {
      validateStatus: (s) => s === 200 || s === 201,
    });
    return { day: res.data, created: res.status === 201 };
  }

  async update(id: string, data: DailyProgressDayUpdate): Promise<DailyProgressDay> {
    return await api.put<DailyProgressDay>(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async getEntries(dayId: string): Promise<DailyProgressEntry[]> {
    return await api.get<DailyProgressEntry[]>(`${this.baseUrl}/${dayId}/entries`);
  }

  async createEntry(dayId: string, data: DailyProgressEntryAdd): Promise<DailyProgressEntry> {
    return await api.post<DailyProgressEntry>(`${this.baseUrl}/${dayId}/entries`, data);
  }

  async updateEntry(entryId: string, data: DailyProgressEntryUpdate): Promise<DailyProgressEntry> {
    return await api.put<DailyProgressEntry>(`${this.baseUrl}/entries/${entryId}`, data);
  }

  async deleteEntry(entryId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/entries/${entryId}`);
  }

  async updateEntryStatus(
    entryId: string,
    status: DailyProgressEntryStatus,
  ): Promise<DailyProgressEntry> {
    return await api.patch<DailyProgressEntry>(`${this.baseUrl}/entries/${entryId}/status`, {
      status,
    });
  }
}

export const dailyProgressService = new DailyProgressService();
