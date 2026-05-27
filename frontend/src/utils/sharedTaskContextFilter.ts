import type { BacklogContextFilter, BacklogListFilters } from "@/types/backlogTask";
import {
  buildDefaultDailyProgressFilters,
  readDailyProgressFilters,
  writeDailyProgressFilters,
} from "@/utils/dailyProgressFiltersStorage";
import { readBacklogFilters, writeBacklogFilters } from "@/utils/listFiltersStorage";

export type SharedTaskContextFilter = BacklogContextFilter;

const SHARED_KEY = "fix-life-shared-task-context-filter";

const DEFAULT_BACKLOG_FILTERS: BacklogListFilters = {
  q: "",
  context: "all",
  priority: "all",
  timeField: "created",
};

function isSharedTaskContextFilter(value: unknown): value is SharedTaskContextFilter {
  return value === "all" || value === "work" || value === "learning" || value === "life";
}

function readSharedKey(): SharedTaskContextFilter | null {
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (!raw) return null;
    const parsed: unknown = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return isSharedTaskContextFilter(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readSharedTaskContextFilter(): SharedTaskContextFilter {
  const fromKey = readSharedKey();
  if (fromKey != null) {
    return fromKey;
  }

  const fromBacklog = readBacklogFilters(DEFAULT_BACKLOG_FILTERS).context ?? "all";
  if (fromBacklog !== "all") {
    writeSharedTaskContextFilter(fromBacklog);
    return fromBacklog;
  }

  const fromDaily = readDailyProgressFilters(buildDefaultDailyProgressFilters()).context;
  if (fromDaily !== "all") {
    writeSharedTaskContextFilter(fromDaily);
    return fromDaily;
  }

  return "all";
}

export function writeSharedTaskContextFilter(context: SharedTaskContextFilter): void {
  try {
    localStorage.setItem(SHARED_KEY, context);
  } catch {
    // ignore storage errors
  }

  const backlog = readBacklogFilters(DEFAULT_BACKLOG_FILTERS);
  writeBacklogFilters({ ...backlog, context });

  const daily = readDailyProgressFilters(buildDefaultDailyProgressFilters());
  writeDailyProgressFilters({ ...daily, context });
}
