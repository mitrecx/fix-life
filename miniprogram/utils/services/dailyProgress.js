const { request, requestRaw } = require("../request");
const { buildQuery } = require("../query");

function listDays(startDate, endDate, context) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (context && context !== "all") params.context = context;
  return request({ url: `/daily-progress/${buildQuery(params)}` }).then(
    (res) => res.daily_progress_days || []
  );
}

async function getDayHeadByDate(progressDate) {
  const res = await requestRaw({
    url: `/daily-progress/by-date/${progressDate}`,
    allowStatuses: [200, 404],
  });
  if (res.statusCode === 404) return null;
  return res.data;
}

function getById(id) {
  return request({ url: `/daily-progress/${id}` });
}

function create(data) {
  return requestRaw({
    url: "/daily-progress/",
    method: "POST",
    data,
    allowStatuses: [200, 201],
  }).then((res) => ({ day: res.data, created: res.statusCode === 201 }));
}

function update(id, data) {
  return request({ url: `/daily-progress/${id}`, method: "PUT", data });
}

function remove(id) {
  return request({ url: `/daily-progress/${id}`, method: "DELETE" });
}

function getEntries(dayId) {
  return request({ url: `/daily-progress/${dayId}/entries` });
}

function createEntry(dayId, data) {
  return request({ url: `/daily-progress/${dayId}/entries`, method: "POST", data });
}

function updateEntry(entryId, data) {
  return request({ url: `/daily-progress/entries/${entryId}`, method: "PUT", data });
}

function removeEntry(entryId) {
  return request({ url: `/daily-progress/entries/${entryId}`, method: "DELETE" });
}

function updateEntryStatus(entryId, status) {
  return request({
    url: `/daily-progress/entries/${entryId}/status`,
    method: "PATCH",
    data: { status },
  });
}

module.exports = {
  listDays,
  getDayHeadByDate,
  getById,
  create,
  update,
  remove,
  getEntries,
  createEntry,
  updateEntry,
  removeEntry,
  updateEntryStatus,
};
