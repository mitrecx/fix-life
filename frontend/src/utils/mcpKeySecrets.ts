const STORAGE_PREFIX = "fixlife-mcp-key:";

export function cacheMcpKeySecret(keyId: string, apiKey: string) {
  sessionStorage.setItem(`${STORAGE_PREFIX}${keyId}`, apiKey);
}

export function getCachedMcpKeySecret(keyId: string): string | null {
  return sessionStorage.getItem(`${STORAGE_PREFIX}${keyId}`);
}

export function removeCachedMcpKeySecret(keyId: string) {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${keyId}`);
}
