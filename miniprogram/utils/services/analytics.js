const { request } = require("../request");
const { buildQuery } = require("../query");

function getDashboard() {
  return request({ url: "/analytics/dashboard" });
}

function getYearly(year) {
  return request({ url: `/analytics/yearly/${year}` });
}

function getMonthly(year, month) {
  return request({ url: `/analytics/monthly/${year}/${month}` });
}

function getCompletionRate(period, opts = {}) {
  const params = { period };
  if (opts.startDate) params.start_date = opts.startDate;
  if (opts.endDate) params.end_date = opts.endDate;
  if (opts.days) params.days = opts.days;
  return request({ url: `/analytics/completion-rate${buildQuery(params)}` });
}

function getHeatmap(opts = {}) {
  const params = {};
  if (opts.startDate) params.start_date = opts.startDate;
  if (opts.endDate) params.end_date = opts.endDate;
  if (opts.days) params.days = opts.days;
  return request({ url: `/analytics/heatmap${buildQuery(params)}` });
}

module.exports = { getDashboard, getYearly, getMonthly, getCompletionRate, getHeatmap };
