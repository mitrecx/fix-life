const {
  TASK_CONTEXT,
  TASK_PRIORITY,
  GOAL_CATEGORIES,
  GOAL_STATUS,
  ENTRY_STATUS,
} = require("./constants");

function findLabel(list, value, fallback) {
  const item = list.find((x) => x.value === value);
  return item ? item.label : fallback || value;
}

function findColor(list, value) {
  const item = list.find((x) => x.value === value);
  return item ? item.color : "#6b7280";
}

function decorateTask(task) {
  return {
    ...task,
    contextLabel: findLabel(TASK_CONTEXT, task.context),
    contextColor: findColor(TASK_CONTEXT, task.context),
    priorityLabel: findLabel(TASK_PRIORITY, task.priority),
    priorityColor: findColor(TASK_PRIORITY, task.priority),
  };
}

function decorateEntry(entry) {
  return {
    ...entry,
    contextLabel: findLabel(TASK_CONTEXT, entry.context),
    contextColor: findColor(TASK_CONTEXT, entry.context),
    priorityLabel: findLabel(TASK_PRIORITY, entry.priority),
    statusLabel: findLabel(ENTRY_STATUS, entry.status),
  };
}

function decorateGoal(goal) {
  return {
    ...goal,
    categoryLabel: findLabel(GOAL_CATEGORIES, goal.category),
    categoryColor: findColor(GOAL_CATEGORIES, goal.category),
    statusLabel: findLabel(GOAL_STATUS, goal.status),
  };
}

function hasPermission(user, code) {
  return Array.isArray(user?.permissions) && user.permissions.includes(code);
}

module.exports = {
  decorateTask,
  decorateEntry,
  decorateGoal,
  findLabel,
  findColor,
  hasPermission,
};
