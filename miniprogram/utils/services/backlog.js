const { request } = require("../request");
const { buildQuery } = require("../query");

function list(tab, filters = {}, options = {}) {
  const params = { tab };
  if (filters.context && filters.context !== "all") params.context = filters.context;
  if (filters.priority && filters.priority !== "all") params.priority = filters.priority;
  if (filters.q) params.q = filters.q.trim();
  if (filters.dateFrom || filters.dateTo) {
    params.time_field = filters.timeField || "created";
    if (filters.dateFrom) params.date_from = filters.dateFrom;
    if (filters.dateTo) params.date_to = filters.dateTo;
  }
  if (options.limit != null) {
    params.limit = options.limit;
    params.offset = options.offset || 0;
  }
  return request({ url: `/backlog-tasks/${buildQuery(params)}` });
}

function get(id) {
  return request({ url: `/backlog-tasks/${id}` });
}

function create(data) {
  return request({ url: "/backlog-tasks/", method: "POST", data });
}

function update(id, data) {
  return request({ url: `/backlog-tasks/${id}`, method: "PUT", data });
}

function remove(id) {
  return request({ url: `/backlog-tasks/${id}`, method: "DELETE" });
}

function complete(id) {
  return request({ url: `/backlog-tasks/${id}/complete`, method: "POST" });
}

function schedule(id, planDate) {
  return request({
    url: `/backlog-tasks/${id}/schedule`,
    method: "POST",
    data: { plan_date: planDate },
  });
}

function revert(id) {
  return request({ url: `/backlog-tasks/${id}/revert`, method: "POST" });
}

module.exports = { list, get, create, update, remove, complete, schedule, revert };
