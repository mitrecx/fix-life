const { request } = require("../request");

function getByDayId(dayId) {
  return request({ url: `/daily-summaries/days/${dayId}/summary` });
}

function create(dayId, data) {
  return request({ url: `/daily-summaries/days/${dayId}/summary`, method: "POST", data });
}

function update(summaryId, data) {
  return request({ url: `/daily-summaries/summaries/${summaryId}`, method: "PUT", data });
}

function remove(summaryId) {
  return request({ url: `/daily-summaries/summaries/${summaryId}`, method: "DELETE" });
}

function getSummaryTypes() {
  return request({ url: "/daily-summaries/summary-types" });
}

module.exports = { getByDayId, create, update, remove, getSummaryTypes };
