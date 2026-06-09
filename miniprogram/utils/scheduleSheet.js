const { monthLabel, buildMonthCalendar, todayString } = require("./date");

function initialData() {
  return {
    showScheduleSheet: false,
    scheduleSheetActive: false,
    scheduleSelectedDate: "",
    scheduleViewYear: 0,
    scheduleViewMonth: 0,
    scheduleMonthLabel: "",
    scheduleCalendarDays: [],
    scheduleDefaultDate: todayString(),
  };
}

function refreshCalendar(page) {
  const { scheduleViewYear, scheduleViewMonth, scheduleSelectedDate } = page.data;
  page.setData({
    scheduleMonthLabel: monthLabel(scheduleViewYear, scheduleViewMonth),
    scheduleCalendarDays: buildMonthCalendar(
      scheduleViewYear,
      scheduleViewMonth,
      scheduleSelectedDate
    ),
  });
}

function open(page, initialDate) {
  const scheduled = initialDate || page.data.scheduleDefaultDate || todayString();
  const [y, m] = scheduled.split("-").map(Number);
  page.setData({
    showScheduleSheet: true,
    scheduleSheetActive: false,
    scheduleSelectedDate: scheduled,
    scheduleViewYear: y,
    scheduleViewMonth: m,
  });
  refreshCalendar(page);
  wx.nextTick(() => {
    setTimeout(() => page.setData({ scheduleSheetActive: true }), 30);
  });
}

function close(page, extraReset = {}) {
  page.setData({ scheduleSheetActive: false });
  setTimeout(() => {
    page.setData({
      showScheduleSheet: false,
      ...extraReset,
    });
  }, 280);
}

function prevMonth(page) {
  let { scheduleViewYear, scheduleViewMonth } = page.data;
  if (scheduleViewMonth === 1) {
    scheduleViewYear -= 1;
    scheduleViewMonth = 12;
  } else {
    scheduleViewMonth -= 1;
  }
  page.setData({ scheduleViewYear, scheduleViewMonth }, () => refreshCalendar(page));
}

function nextMonth(page) {
  let { scheduleViewYear, scheduleViewMonth } = page.data;
  if (scheduleViewMonth === 12) {
    scheduleViewYear += 1;
    scheduleViewMonth = 1;
  } else {
    scheduleViewMonth += 1;
  }
  page.setData({ scheduleViewYear, scheduleViewMonth }, () => refreshCalendar(page));
}

function selectDay(page, date) {
  if (!date) return;
  const [y, m] = date.split("-").map(Number);
  page.setData(
    {
      scheduleSelectedDate: date,
      scheduleViewYear: y,
      scheduleViewMonth: m,
    },
    () => refreshCalendar(page)
  );
}

module.exports = {
  initialData,
  refreshCalendar,
  open,
  close,
  prevMonth,
  nextMonth,
  selectDay,
};
