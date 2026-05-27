import type { BacklogListFilters } from "@/types/backlogTask";
import type { QuickNoteListFilters } from "@/types/quickNote";
import type { GoalCategory } from "@/types/yearlyGoal";
import { GOAL_CATEGORIES } from "@/types/yearlyGoal";

function readJson<T>(key: string, fallback: T, merge: (parsed: unknown, fallback: T) => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return merge(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, state: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const GOAL_CATEGORY_VALUES = new Set(GOAL_CATEGORIES.map((item) => item.value));

// --- Backlog / Todos ---

const BACKLOG_FILTERS_KEY = "fix-life-backlog-filters";

export function readBacklogFilters(fallback: BacklogListFilters): BacklogListFilters {
  return readJson(BACKLOG_FILTERS_KEY, fallback, (parsed, fb) => {
    if (!parsed || typeof parsed !== "object") {
      return fb;
    }
    const data = parsed as Partial<BacklogListFilters>;
    const context =
      data.context === "work" || data.context === "learning" || data.context === "life" || data.context === "all"
        ? data.context
        : fb.context;
    const priority =
      data.priority === "high" || data.priority === "medium" || data.priority === "low" || data.priority === "all"
        ? data.priority
        : fb.priority;
    const timeField =
      data.timeField === "created" || data.timeField === "scheduled" || data.timeField === "completed"
        ? data.timeField
        : fb.timeField;
    return {
      q: typeof data.q === "string" ? data.q : fb.q,
      context,
      priority,
      timeField,
      dateFrom: isValidDateString(data.dateFrom) ? data.dateFrom : fb.dateFrom,
      dateTo: isValidDateString(data.dateTo) ? data.dateTo : fb.dateTo,
    };
  });
}

export function writeBacklogFilters(filters: BacklogListFilters): void {
  writeJson(BACKLOG_FILTERS_KEY, filters);
}

export function urlHasBacklogFilterParams(params: URLSearchParams): boolean {
  return ["q", "context", "priority", "time_field", "date_from", "date_to"].some((key) => params.has(key));
}

// --- Monthly plans ---

const MONTHLY_PLAN_FILTERS_KEY = "fix-life-monthly-plans-filters";

export interface MonthlyPlanFiltersState {
  year: number;
}

export function buildDefaultMonthlyPlanFilters(): MonthlyPlanFiltersState {
  return { year: new Date().getFullYear() };
}

export function readMonthlyPlanFilters(fallback = buildDefaultMonthlyPlanFilters()): MonthlyPlanFiltersState {
  return readJson(MONTHLY_PLAN_FILTERS_KEY, fallback, (parsed, fb) => {
    if (!parsed || typeof parsed !== "object") {
      return fb;
    }
    const year = (parsed as Partial<MonthlyPlanFiltersState>).year;
    return typeof year === "number" && Number.isFinite(year) ? { year } : fb;
  });
}

export function writeMonthlyPlanFilters(state: MonthlyPlanFiltersState): void {
  writeJson(MONTHLY_PLAN_FILTERS_KEY, state);
}

// --- Quick notes ---

const QUICK_NOTE_FILTERS_KEY = "fix-life-quick-notes-filters";

export function readQuickNoteFilters(fallback: QuickNoteListFilters = {}): QuickNoteListFilters {
  return readJson(QUICK_NOTE_FILTERS_KEY, fallback, (parsed, fb) => {
    if (!parsed || typeof parsed !== "object") {
      return fb;
    }
    const data = parsed as Partial<QuickNoteListFilters>;
    return {
      q: typeof data.q === "string" ? data.q : fb.q,
      dateFrom: isValidDateString(data.dateFrom) ? data.dateFrom : fb.dateFrom,
      dateTo: isValidDateString(data.dateTo) ? data.dateTo : fb.dateTo,
    };
  });
}

export function writeQuickNoteFilters(filters: QuickNoteListFilters): void {
  writeJson(QUICK_NOTE_FILTERS_KEY, filters);
}

// --- Yearly goals ---

const YEARLY_GOAL_FILTERS_KEY = "fix-life-yearly-goals-filters";

export interface YearlyGoalFiltersState {
  year: number;
  category?: GoalCategory;
}

export function buildDefaultYearlyGoalFilters(): YearlyGoalFiltersState {
  return { year: new Date().getFullYear() };
}

export function readYearlyGoalFilters(fallback = buildDefaultYearlyGoalFilters()): YearlyGoalFiltersState {
  return readJson(YEARLY_GOAL_FILTERS_KEY, fallback, (parsed, fb) => {
    if (!parsed || typeof parsed !== "object") {
      return fb;
    }
    const data = parsed as Partial<YearlyGoalFiltersState>;
    const year = data.year;
    const category = data.category;
    return {
      year: typeof year === "number" && Number.isFinite(year) ? year : fb.year,
      category:
        typeof category === "string" && GOAL_CATEGORY_VALUES.has(category as GoalCategory)
          ? (category as GoalCategory)
          : fb.category,
    };
  });
}

export function writeYearlyGoalFilters(state: YearlyGoalFiltersState): void {
  writeJson(YEARLY_GOAL_FILTERS_KEY, state);
}

// --- Analytics ---

const ANALYTICS_FILTERS_KEY = "fix-life-analytics-filters";

export interface AnalyticsFiltersState {
  year: number;
}

export function buildDefaultAnalyticsFilters(): AnalyticsFiltersState {
  return { year: new Date().getFullYear() };
}

export function readAnalyticsFilters(fallback = buildDefaultAnalyticsFilters()): AnalyticsFiltersState {
  return readJson(ANALYTICS_FILTERS_KEY, fallback, (parsed, fb) => {
    if (!parsed || typeof parsed !== "object") {
      return fb;
    }
    const year = (parsed as Partial<AnalyticsFiltersState>).year;
    return typeof year === "number" && Number.isFinite(year) ? { year } : fb;
  });
}

export function writeAnalyticsFilters(state: AnalyticsFiltersState): void {
  writeJson(ANALYTICS_FILTERS_KEY, state);
}
