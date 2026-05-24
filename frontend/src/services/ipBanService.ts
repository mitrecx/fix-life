import { rawApi } from "./api";
import type { BannedIpListResponse } from "@/types/ipBan";

export class IpBanForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
    this.name = "IpBanForbiddenError";
  }
}

function isBannedIpListResponse(data: unknown): data is BannedIpListResponse {
  return (
    data !== null &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as BannedIpListResponse).items)
  );
}

function throwIfForbidden(data: unknown): void {
  if (data !== null && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? JSON.stringify(detail)
          : "请求失败";
    const lower = msg.toLowerCase();
    if (lower.includes("permission") || lower.includes("insufficient") || lower.includes("forbidden")) {
      throw new IpBanForbiddenError();
    }
    throw new Error(msg);
  }
}

export async function listIpBans(): Promise<BannedIpListResponse> {
  const data = await rawApi.get<unknown>("/system/ip-bans", {
    validateStatus: (s) => s === 200 || s === 403 || s === 401,
  });

  if (isBannedIpListResponse(data)) {
    return data;
  }

  throwIfForbidden(data);
  throw new Error("无效的 IP 封禁列表响应");
}

export async function unbanIp(ip: string, scope: string): Promise<void> {
  const params = new URLSearchParams({ scope });
  const data: unknown = await rawApi.delete(
    `/system/ip-bans/${encodeURIComponent(ip)}?${params.toString()}`,
    {
      validateStatus: (s) => s === 204 || s === 403 || s === 404 || s === 401,
    }
  );

  if (data == null) {
    return;
  }
  if (typeof data === "string" && data.length === 0) {
    return;
  }

  throwIfForbidden(data);
  if (typeof data === "object" && "detail" in data) {
    throw new Error(String((data as { detail: unknown }).detail));
  }
}
