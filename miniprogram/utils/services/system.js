const { request } = require("../request");
const { buildQuery } = require("../query");

function getStatus() {
  return request({ url: "/system/status" });
}

function listIpBans() {
  return request({ url: "/system/ip-bans" });
}

function unbanIp(ip, scope) {
  return request({
    url: `/system/ip-bans/${encodeURIComponent(ip)}${buildQuery({ scope })}`,
    method: "DELETE",
  });
}

module.exports = { getStatus, listIpBans, unbanIp };
