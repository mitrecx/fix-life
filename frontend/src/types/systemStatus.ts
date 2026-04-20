export interface StatusCheckItem {
  name: string;
  ok: boolean;
  latency_ms?: number;
  error?: string;
}

export interface SystemStatusResponse {
  checked_at: string;
  all_ok: boolean;
  checks: StatusCheckItem[];
}
