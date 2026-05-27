import { useRef, type SyntheticEvent } from "react";

export interface TaskCardFillProgressProps {
  value: number;
  min?: number;
  max?: number;
  /** When set, renders past (0→past) and today (past→value) as two subtle fill tones. */
  pastValue?: number;
  /** Optional extra segment label, e.g. daily delta shown inside the bar. */
  todayDelta?: number;
  disabled?: boolean;
  ariaLabel: string;
  sliderDataAttr?: string;
  title?: string;
  onValueChange: (value: number) => void;
  onCommit: (value: number) => void;
  onInteractStart?: () => void;
  onInteractEnd?: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function buildBarLabel(value: number, todayDelta?: number): string {
  if (todayDelta != null && todayDelta > 0) {
    return `${value}% · 当日 +${todayDelta}%`;
  }
  return `${value}%`;
}

export function TaskCardFillProgress({
  value,
  min = 0,
  max = 100,
  pastValue,
  todayDelta,
  disabled = false,
  ariaLabel,
  sliderDataAttr = "data-task-progress-slider",
  title,
  onValueChange,
  onCommit,
  onInteractStart,
  onInteractEnd,
}: TaskCardFillProgressProps) {
  const draggingRef = useRef(false);
  const clampedValue = clamp(value, min, max);
  const past = pastValue != null ? clamp(pastValue, 0, clampedValue) : undefined;
  const label = buildBarLabel(clampedValue, todayDelta);

  const beginInteraction = (event: SyntheticEvent) => {
    event.stopPropagation();
    if (disabled) return;
    if (!draggingRef.current) {
      draggingRef.current = true;
      onInteractStart?.();
    }
  };

  const endInteraction = (event: SyntheticEvent, nextValue?: number) => {
    event.stopPropagation();
    if (draggingRef.current) {
      draggingRef.current = false;
      onInteractEnd?.();
    }
    if (nextValue != null) {
      onCommit(clamp(nextValue, min, max));
    }
  };

  return (
    <div
      {...{ [sliderDataAttr]: true }}
      className="relative h-7 touch-none shrink-0 overflow-hidden bg-gray-50/90"
      title={title}
      onPointerDown={beginInteraction}
      onTouchStart={beginInteraction}
      onMouseDown={beginInteraction}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {past != null ? (
          <>
            <div
              className="absolute inset-y-0 left-0 bg-gray-200/45"
              style={{ width: `${past}%` }}
            />
            {clampedValue > past && (
              <div
                className="absolute inset-y-0 bg-indigo-500/10"
                style={{ left: `${past}%`, width: `${clampedValue - past}%` }}
              />
            )}
          </>
        ) : (
          <div
            className="absolute inset-y-0 left-0 bg-indigo-500/10"
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>

      {clampedValue >= 22 ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 min-w-0"
          style={{ width: `${clampedValue}%` }}
          aria-hidden
        >
          <span className="text-xs text-gray-600 tabular-nums truncate whitespace-nowrap">{label}</span>
        </div>
      ) : (
        <span
          className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-gray-500 tabular-nums whitespace-nowrap"
          aria-hidden
        >
          {label}
        </span>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={clampedValue}
        disabled={disabled}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onChange={(e) => onValueChange(clamp(Number(e.target.value), min, max))}
        onPointerUp={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onMouseUp={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onTouchEnd={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onPointerCancel={(e) => endInteraction(e)}
        onBlur={(e) => endInteraction(e, Number(e.currentTarget.value))}
        onKeyUp={(e) => endInteraction(e, Number(e.currentTarget.value))}
        className="task-card-fill-progress-range absolute inset-0 m-0 w-full cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-default"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clampedValue}
      />
    </div>
  );
}
