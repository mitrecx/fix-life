const { request } = require("../request");
const { buildQuery } = require("../query");

function list(params = {}) {
  return request({ url: `/weekly-summaries/${buildQuery(params)}` });
}

function getById(id) {
  return request({ url: `/weekly-summaries/${id}` });
}

function create(data) {
  return request({ url: "/weekly-summaries/", method: "POST", data });
}

function generate(data) {
  return request({ url: "/weekly-summaries/generate", method: "POST", data });
}

function update(id, data) {
  return request({ url: `/weekly-summaries/${id}`, method: "PUT", data });
}

function remove(id) {
  return request({ url: `/weekly-summaries/${id}`, method: "DELETE" });
}

module.exports = { list, getById, create, generate, update, remove };
