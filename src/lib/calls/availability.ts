import { CALL, CALL_DURATION_MS, DAY_MS, HOUR_MS } from './config';
import { listBookedIntervals } from './bookings';
import { listBusy, listOpenWindows } from './google';
import { computeSlots } from './slots';

/** Every bookable slot start from now through the booking horizon. */
export async function getOpenSlots(now: Date = new Date()): Promise<Date[]> {
  const to = new Date(now.getTime() + CALL.horizonDays * DAY_MS);
  const [windows, busy, booked] = await Promise.all([
    listOpenWindows(now, to),
    listBusy(now, to),
    listBookedIntervals(now, to),
  ]);

  return computeSlots({
    windows,
    busy: [...busy, ...booked],
    durationMs: CALL_DURATION_MS,
    earliest: now.getTime() + CALL.minNoticeHours * HOUR_MS,
    // Open windows come back whole, but busy time and bookings were only
    // fetched up to `to`.
    latest: to.getTime(),
  }).map((ms) => new Date(ms));
}

/** Whether `start` is one of the slots the page would offer right now. */
export async function isSlotOpen(start: Date, now: Date = new Date()): Promise<boolean> {
  const slots = await getOpenSlots(now);
  return slots.some((slot) => slot.getTime() === start.getTime());
}
