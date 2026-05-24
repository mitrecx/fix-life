export interface BannedIpItem {
  ip: string;
  scope: string;
  ttl_seconds: number;
  request_count: number;
}

export interface BannedIpListResponse {
  items: BannedIpItem[];
}
