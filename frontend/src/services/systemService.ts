import { rawApi } from "./api";
import type { SystemStatusResponse } from "@/types/systemStatus";

export class SystemStatusForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
    this.name = "SystemStatusForbiddenError";
  }
}

function isSystemStatusResponse(data: unknown): data is SystemStatusResponse {
  return (
    data !== null &&
    typeof data === "object" &&
    "checks" in data &&
    Array.isArray((data as SystemStatusResponse).checks) &&
    "all_ok" in data &&
    "checked_at" in data
  );
}

/**
 * Uses rawApi with validateStatus so 403 does not trigger global axios error handling.
 * Note: response interceptor already unwraps to response.data, so the resolved value IS the JSON body.
 */
export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const data = await rawApi.get<unknown>("/system/status", {
    validateStatus: (s) => s === 200 || s === 403 || s === 401,
  });

  if (isSystemStatusResponse(data)) {
    return data;
  }

  if (data !== null && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? JSON.stringify(detail) : "请求失败";
    const lower = msg.toLowerCase();
    if (lower.includes("permission") || lower.includes("insufficient") || lower.includes("forbidden")) {
      throw new SystemStatusForbiddenError();
    }
    if (lower.includes("credentials") || lower.includes("unauthorized")) {
      throw new Error("UNAUTHORIZED");
    }
    throw new Error(msg);
  }

  throw new Error("无效的系统状态响应");
}
