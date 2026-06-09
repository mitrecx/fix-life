function pad2(n) {
  return `${n}`.padStart(2, "0");
}

/** Backend stores naive UTC; API JSON often omits the timezone suffix. */
function parseServerDateTime(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return new Date(Number.NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw);
  }
  const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  return new Date(`${normalized}Z`);
}

function formatDate(d) {
  const date = d instanceof Date ? d : parseServerDateTime(d);
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

function formatQuickNoteMessageTime(iso) {
  const d = parseServerDateTime(iso);
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatQuickNoteDateDivider(iso) {
  const d = parseServerDateTime(iso);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${weekdays[d.getDay()]}`;
}

function isSameCalendarDay(a, b) {
  return formatDate(parseServerDateTime(a)) === formatDate(parseServerDateTime(b));
}

function monthLabel(year, month) {
  return `${year}年${month}月`;
}

function buildMonthCalendar(year, month, selectedDate) {
  const today = todayString();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const cells = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const date = formatDate(new Date(prevYear, prevMonth - 1, day));
    cells.push({
      day,
      date,
      otherMonth: true,
      selected: date === selectedDate,
      today: date === today,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(new Date(year, month - 1, day));
    cells.push({
      day,
      date,
      otherMonth: false,
      selected: date === selectedDate,
      today: date === today,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const date = formatDate(new Date(nextYear, nextMonth - 1, nextDay));
    cells.push({
      day: nextDay,
      date,
      otherMonth: true,
      selected: date === selectedDate,
      today: date === today,
    });
    nextDay += 1;
  }

  return cells;
}

module.exports = {
  parseServerDateTime,
  formatDate,
  todayString,
  parseDate,
  addDays,
  weekDates,
  formatDisplayDate,
  formatQuickNoteMessageTime,
  formatQuickNoteDateDivider,
  isSameCalendarDay,
  monthLabel,
  buildMonthCalendar,
};
