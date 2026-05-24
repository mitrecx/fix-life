export interface McpApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_suffix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface McpApiKeyCreateResponse extends McpApiKey {
  api_key: string;
}
