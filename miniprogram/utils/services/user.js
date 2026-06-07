const { request, uploadFile } = require("../request");

function getMe() {
  return request({ url: "/users/me" });
}

function updateProfile(data) {
  return request({ url: "/users/me", method: "PUT", data });
}

function changePassword(data) {
  return request({ url: "/users/me/change-password", method: "POST", data });
}

function uploadAvatar(filePath) {
  return uploadFile({ url: "/users/me/upload-avatar", filePath, name: "file" });
}

module.exports = { getMe, updateProfile, changePassword, uploadAvatar };
