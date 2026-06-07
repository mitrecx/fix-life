const { request } = require("../request");

function getSettings() {
  return request({ url: "/system-settings/me" });
}

function updateSettings(data) {
  return request({ url: "/system-settings/me", method: "PUT", data });
}

function listMcpKeys() {
  return request({ url: "/system-settings/mcp-keys" }).then((res) => res.items || []);
}

function createMcpKey(name) {
  return request({ url: "/system-settings/mcp-keys", method: "POST", data: { name } });
}

function revokeMcpKey(keyId) {
  return request({ url: `/system-settings/mcp-keys/${keyId}`, method: "DELETE" });
}

module.exports = { getSettings, updateSettings, listMcpKeys, createMcpKey, revokeMcpKey };
