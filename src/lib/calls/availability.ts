import { CALL, CALL_DURATION_MS, DAY_MS, HOUR_MS } from './config';
import { listBookedIntervals } from './bookings';
import { listBusy, listOpenWindows } from './google';
import { computeSlots } from './slots';

interface CalendarIntervals {
  windows: Awaited<ReturnType<typeof listOpenWindows>>;
  busy: Awaited<ReturnType<typeof listBusy>>;
  /** Busy time is only known up to here. */
  to: number;
}

const CALENDAR_CACHE_MS = 60_000;
let calendarCache: { fetchedAt: number; value: Promise<CalendarIntervals> } | null = null;

/**
 * Google Calendar windows and busy time, shared for a minute per instance so
 * page loads can't burn through the Calendar API quota. Checkout passes
 * `fresh` so a booking is always checked against the live calendar.
 */
function calendarIntervals(now: Date, to: Date, fresh: boolean): Promise<CalendarIntervals> {
  const cached = calendarCache;
  if (!fresh && cached && now.getTime() - cached.fetchedAt < CALENDAR_CACHE_MS) return cached.value;
  const value = Promise.all([listOpenWindows(now, to), listBusy(now, to)]).then(
    ([windows, busy]) => ({ windows, busy, to: to.getTime() }),
  );
  calendarCache = { fetchedAt: now.getTime(), value };
  value.catch(() => {
    if (calendarCache?.value === value) calendarCache = null;
  });
  return value;
}

/** Every bookable slot start from now through the booking horizon. */
export async function getOpenSlots(now: Date = new Date(), { fresh = false } = {}): Promise<Date[]> {
  const to = new Date(now.getTime() + CALL.horizonDays * DAY_MS);
  const [{ windows, busy, to: calendarTo }, booked] = await Promise.all([
    calendarIntervals(now, to, fresh),
    listBookedIntervals(now, to),
  ]);

  return computeSlots({
    windows,
    busy: [...busy, ...booked],
    durationMs: CALL_DURATION_MS,
    earliest: now.getTime() + CALL.minNoticeHours * HOUR_MS,
    // Open windows come back whole, but busy time and bookings were only
    // fetched up to `to`.
    latest: Math.min(to.getTime(), calendarTo),
  }).map((ms) => new Date(ms));
}

/** Whether `start` is one of the slots the page would offer right now. */
export async function isSlotOpen(start: Date, now: Date = new Date()): Promise<boolean> {
  const slots = await getOpenSlots(now, { fresh: true });
  return slots.some((slot) => slot.getTime() === start.getTime());
}
