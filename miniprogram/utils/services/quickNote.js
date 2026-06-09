const { request, uploadFile } = require("../request");
const { buildQuery } = require("../query");

function list(filters = {}, limit = 200, offset = 0) {
  const params = { limit, offset };
  if (filters.q) params.q = filters.q.trim();
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  return request({ url: `/quick-notes/${buildQuery(params)}` });
}

function create(data) {
  return request({ url: "/quick-notes/", method: "POST", data });
}

function remove(id) {
  return request({ url: `/quick-notes/${id}`, method: "DELETE" });
}

function batchDelete(ids) {
  return request({ url: "/quick-notes/batch-delete", method: "POST", data: { ids } });
}

function batchMerge(ids) {
  return request({ url: "/quick-notes/batch-merge", method: "POST", data: { ids } });
}

function uploadImage(filePath) {
  return uploadFile({ url: "/quick-notes/upload-image", filePath, name: "file" });
}

module.exports = { list, create, remove, batchDelete, batchMerge, uploadImage };
