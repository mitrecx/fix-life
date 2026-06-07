function pad2(n) {
  return `${n}`.padStart(2, "0");
}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayString() {
  return formatDate(new Date());
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(str, delta) {
  const d = parseDate(str);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

function weekDates(centerDate) {
  const center = parseDate(centerDate);
  const day = center.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(center);
  monday.setDate(center.getDate() + mondayOffset);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

function formatDisplayDate(str) {
  const d = parseDate(str);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`;
}

function monthLabel(year, month) {
  return `${year}年${month}月`;
}

module.exports = {
  formatDate,
  todayString,
  parseDate,
  addDays,
  weekDates,
  formatDisplayDate,
  monthLabel,
};
