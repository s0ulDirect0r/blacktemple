// Pure slot arithmetic: open windows minus busy time, cut into call-length slots.
// All times are epoch milliseconds, so time zones only matter for display.

export interface Interval {
  start: number;
  end: number;
}

/** Sort and merge overlapping or touching intervals. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Slot start times inside the open windows. Each window is cut back to back
 * from its start, so a 2–5pm window with 60-minute calls offers 2, 3 and 4pm.
 * A slot is dropped if it starts before `earliest`, ends after `latest`, or
 * touches any busy interval. `latest` must not exceed the range `busy` was
 * fetched for, or slots past it would skip the busy check.
 */
export function computeSlots({
  windows,
  busy,
  durationMs,
  earliest,
  latest,
}: {
  windows: Interval[];
  busy: Interval[];
  durationMs: number;
  earliest: number;
  latest: number;
}): number[] {
  const busyMerged = mergeIntervals(busy);
  const slots: number[] = [];

  for (const window of mergeIntervals(windows)) {
    for (let start = window.start; start + durationMs <= window.end; start += durationMs) {
      if (start < earliest || start + durationMs > latest) continue;
      const slot = { start, end: start + durationMs };
      if (busyMerged.some((b) => overlaps(slot, b))) continue;
      slots.push(start);
    }
  }

  return slots;
}
