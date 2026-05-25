export interface QuickNote {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface QuickNoteList {
  notes: QuickNote[];
  total: number;
}

export interface QuickNoteListFilters {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface QuickNoteCreate {
  content: string;
}

export interface QuickNoteImageUploadResponse {
  url: string;
}

export interface QuickNoteBatchDeleteResponse {
  deleted: number;
}
