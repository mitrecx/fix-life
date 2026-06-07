const { request } = require("../request");
const { buildQuery } = require("../query");

function list(year, category) {
  const params = {};
  if (year) params.year = year;
  if (category) params.category = category;
  return request({ url: `/yearly-goals/${buildQuery(params)}` }).then((res) => res.goals || []);
}

function getById(id) {
  return request({ url: `/yearly-goals/${id}` });
}

function create(data) {
  return request({ url: "/yearly-goals/", method: "POST", data });
}

function update(id, data) {
  return request({ url: `/yearly-goals/${id}`, method: "PUT", data });
}

function updateProgress(id, data) {
  return request({ url: `/yearly-goals/${id}/progress`, method: "PATCH", data });
}

function remove(id) {
  return request({ url: `/yearly-goals/${id}`, method: "DELETE" });
}

module.exports = { list, getById, create, update, updateProgress, remove };
