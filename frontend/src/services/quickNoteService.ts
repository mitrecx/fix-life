import api from "./api";
import type {
  QuickNote,
  QuickNoteBatchDeleteResponse,
  QuickNoteBatchMergeResponse,
  QuickNoteCreate,
  QuickNoteImageUploadResponse,
  QuickNoteList,
  QuickNoteListFilters,
} from "@/types/quickNote";

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

  async uploadImage(file: File): Promise<QuickNoteImageUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<QuickNoteImageUploadResponse>(`${this.baseUrl}/upload-image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${noteId}`);
  }

  async deleteNotes(noteIds: string[]): Promise<QuickNoteBatchDeleteResponse> {
    return api.post<QuickNoteBatchDeleteResponse>(`${this.baseUrl}/batch-delete`, {
      ids: noteIds,
    });
  }

  async mergeNotes(noteIds: string[]): Promise<QuickNoteBatchMergeResponse> {
    return api.post<QuickNoteBatchMergeResponse>(`${this.baseUrl}/batch-merge`, {
      ids: noteIds,
    });
  }
}

export const quickNoteService = new QuickNoteService();
