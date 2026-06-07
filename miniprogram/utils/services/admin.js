const { request } = require("../request");

function listUsers() {
  return request({ url: "/admin/users" });
}

function createUser(data) {
  return request({ url: "/admin/users", method: "POST", data });
}

function removeUser(id) {
  return request({ url: `/admin/users/${id}`, method: "DELETE" });
}

function unlockLogin(id) {
  return request({ url: `/admin/users/${id}/unlock-login`, method: "POST" });
}

module.exports = { listUsers, createUser, removeUser, unlockLogin };
