import { rawApi } from "./api";
import type { SystemStatusResponse } from "@/types/systemStatus";

export class SystemStatusForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
    this.name = "SystemStatusForbiddenError";
  }
}

export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const res = await rawApi.get<SystemStatusResponse>("/system/status", {
    validateStatus: (s) => s === 200 || s === 403 || s === 401,
  });
  if (res.status === 403) {
    throw new SystemStatusForbiddenError();
  }
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  return res.data;
}
