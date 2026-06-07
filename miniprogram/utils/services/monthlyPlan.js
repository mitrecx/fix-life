const { request } = require("../request");
const { buildQuery } = require("../query");

function list(year, month) {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  return request({ url: `/monthly-plans/${buildQuery(params)}` }).then((res) => res.plans || []);
}

function getById(id) {
  return request({ url: `/monthly-plans/${id}` });
}

function create(data) {
  return request({ url: "/monthly-plans/", method: "POST", data });
}

function update(id, data) {
  return request({ url: `/monthly-plans/${id}`, method: "PUT", data });
}

function remove(id) {
  return request({ url: `/monthly-plans/${id}`, method: "DELETE" });
}

function getTasks(planId) {
  return request({ url: `/monthly-plans/${planId}/tasks` });
}

function createTask(planId, data) {
  return request({ url: `/monthly-plans/${planId}/tasks`, method: "POST", data });
}

function updateTask(taskId, data) {
  return request({ url: `/monthly-plans/tasks/${taskId}`, method: "PUT", data });
}

function removeTask(taskId) {
  return request({ url: `/monthly-plans/tasks/${taskId}`, method: "DELETE" });
}

function updateTaskStatus(taskId, status) {
  return request({
    url: `/monthly-plans/tasks/${taskId}/status`,
    method: "PATCH",
    data: { status },
  });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getTasks,
  createTask,
  updateTask,
  removeTask,
  updateTaskStatus,
};
