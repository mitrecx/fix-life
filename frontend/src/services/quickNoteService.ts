import api from "./api";
import type { QuickNote, QuickNoteCreate, QuickNoteList, QuickNoteListFilters } from "@/types/quickNote";

class QuickNoteService {
  private baseUrl = "/quick-notes";

  async listNotes(
    filters: QuickNoteListFilters = {},
    limit = 200,
    offset = 0,
  ): Promise<QuickNoteList> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const q = filters.q?.trim();
    if (q) {
      params.set("q", q);
    }
    if (filters.dateFrom) {
      params.set("date_from", filters.dateFrom);
    }
    if (filters.dateTo) {
      params.set("date_to", filters.dateTo);
    }
    return api.get<QuickNoteList>(`${this.baseUrl}?${params.toString()}`);
  }

  async createNote(data: QuickNoteCreate): Promise<QuickNote> {
    return api.post<QuickNote>(this.baseUrl, data);
  }

  async deleteNote(noteId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${noteId}`);
  }
}

export const quickNoteService = new QuickNoteService();
