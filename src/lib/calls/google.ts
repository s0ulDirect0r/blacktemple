// Google Calendar over plain REST, authorized as Matthew with a stored refresh
// token (see scripts/google-calendar-auth.ts).
//
// - Open windows: events on the "open for calls" calendar
//   (CALLS_AVAILABILITY_CALENDAR_ID).
// - Busy time: free/busy for CALLS_BUSY_CALENDAR_IDS (default: primary).
// - Bookings: an event on the primary calendar that invites the buyer and
//   carries a Google Meet link; Google emails the invite and reminders.

import type { Interval } from './slots';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_URL = 'https://www.googleapis.com/calendar/v3';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function busyCalendarIds(): string[] {
  const ids = (process.env.CALLS_BUSY_CALENDAR_IDS ?? 'primary')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : ['primary'];
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function calendarApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new GoogleApiError(
      response.status,
      `Google Calendar ${init.method ?? 'GET'} ${path} failed (${response.status}): ${await response.text()}`,
    );
  }
  return (await response.json()) as T;
}

interface GoogleEvent {
  id: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
}

/** Timed events on the availability calendar, expanded from their recurrences. */
export async function listOpenWindows(timeMin: Date, timeMax: Date): Promise<Interval[]> {
  const calendarId = encodeURIComponent(requireEnv('CALLS_AVAILABILITY_CALENDAR_ID'));
  const windows: Interval[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const page = await calendarApi<{ items?: GoogleEvent[]; nextPageToken?: string }>(
      `/calendars/${calendarId}/events?${params}`,
    );
    for (const event of page.items ?? []) {
      // All-day events carry `date` rather than `dateTime`; they don't define hours.
      if (event.status === 'cancelled' || !event.start?.dateTime || !event.end?.dateTime) continue;
      windows.push({ start: Date.parse(event.start.dateTime), end: Date.parse(event.end.dateTime) });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return windows;
}

/** Busy time across Matthew's own calendars. */
export async function listBusy(timeMin: Date, timeMax: Date): Promise<Interval[]> {
  const ids = busyCalendarIds();
  const result = await calendarApi<{
    calendars: Record<string, { busy?: Array<{ start: string; end: string }>; errors?: unknown[] }>;
  }>('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: ids.map((id) => ({ id })),
    }),
  });

  const busy: Interval[] = [];
  for (const id of ids) {
    const calendar = result.calendars[id];
    // An unreadable calendar would silently look free; fail instead.
    if (!calendar || calendar.errors?.length) {
      throw new Error(`Google free/busy could not read calendar ${id}: ${JSON.stringify(calendar?.errors)}`);
    }
    for (const period of calendar.busy ?? []) {
      busy.push({ start: Date.parse(period.start), end: Date.parse(period.end) });
    }
  }
  return busy;
}

export interface CallEvent {
  eventId: string;
  meetUrl: string | null;
}

function toCallEvent(event: GoogleEvent): CallEvent {
  const video = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video');
  return { eventId: event.id, meetUrl: event.hangoutLink ?? video?.uri ?? null };
}

/**
 * Put the call on the primary calendar and invite the buyer. The event id is
 * the booking id, so a retry (webhook and success page racing, or Stripe
 * redelivering) finds the existing event instead of inviting twice.
 */
export async function createCallEvent(booking: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  name: string;
  email: string;
  note: string | null;
}): Promise<CallEvent> {
  const description = [
    'Booked at blacktemple.dev/calls.',
    booking.note ? `\nFrom ${booking.name}:\n${booking.note}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const event = await calendarApi<GoogleEvent>(
      '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        body: JSON.stringify({
          id: booking.id,
          summary: `${booking.name} + Matthew D. Huff`,
          description,
          start: { dateTime: booking.startsAt.toISOString() },
          end: { dateTime: booking.endsAt.toISOString() },
          attendees: [{ email: booking.email, displayName: booking.name }],
          conferenceData: {
            createRequest: { requestId: booking.id, conferenceSolutionKey: { type: 'hangoutsMeet' } },
          },
          reminders: { useDefault: true },
        }),
      },
    );
    return toCallEvent(event);
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 409) {
      return toCallEvent(await calendarApi<GoogleEvent>(`/calendars/primary/events/${booking.id}`));
    }
    throw error;
  }
}
