import type { DailyProgressContextFilter } from "@/services/dailyProgressService";

function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function getCurrentWeekNumber(): number {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const firstDayOfWeek = firstDay.getDay();
  const firstMonday = new Date(firstDay);
  if (firstDayOfWeek === 0) {
    firstMonday.setDate(firstDay.getDate() + 1);
  } else if (firstDayOfWeek !== 1) {
    firstMonday.setDate(firstDay.getDate() + ((8 - firstDayOfWeek) % 7));
  }
  const daysDiff = Math.floor((today.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(daysDiff / 7) + 1);
}

export function buildDefaultDailyProgressFilters(): DailyProgressFiltersState {
  const { monday, sunday } = getCurrentWeekRange();
  const today = new Date();
  return {
    context: "all",
    startDate: formatLocalYMD(monday),
    endDate: formatLocalYMD(sunday),
    selectedYear: today.getFullYear(),
    selectedWeek: getCurrentWeekNumber(),
  };
}

const STORAGE_KEY = "fix-life-daily-progress-filters";
const LEGACY_STORAGE_KEY = "fix-life-daily-plans-filters";

export interface DailyProgressFiltersState {
  context: DailyProgressContextFilter;
  startDate: string;
  endDate: string;
  selectedYear: number;
  selectedWeek: number;
}

function isDailyProgressContextFilter(value: unknown): value is DailyProgressContextFilter {
  return value === "all" || value === "work" || value === "learning" || value === "life";
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function readDailyProgressFilters(fallback: DailyProgressFiltersState): DailyProgressFiltersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<DailyProgressFiltersState>;
    const state = {
      context: isDailyProgressContextFilter(parsed.context) ? parsed.context : fallback.context,
      startDate: isValidDateString(parsed.startDate) ? parsed.startDate : fallback.startDate,
      endDate: isValidDateString(parsed.endDate) ? parsed.endDate : fallback.endDate,
      selectedYear:
        typeof parsed.selectedYear === "number" && Number.isFinite(parsed.selectedYear)
          ? parsed.selectedYear
          : fallback.selectedYear,
      selectedWeek:
        typeof parsed.selectedWeek === "number" &&
        Number.isFinite(parsed.selectedWeek) &&
        parsed.selectedWeek >= 1 &&
        parsed.selectedWeek <= 53
          ? parsed.selectedWeek
          : fallback.selectedWeek,
    };
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_STORAGE_KEY)) {
      writeDailyProgressFilters(state);
    }
    return state;
  } catch {
    return fallback;
  }
}

export function writeDailyProgressFilters(state: DailyProgressFiltersState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}
