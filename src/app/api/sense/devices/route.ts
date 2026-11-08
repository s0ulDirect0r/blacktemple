import { senseHandler, jsonBody } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { createDevice, listDevices } from '@/lib/sense/devices';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async actor => {
  requireOwner(actor);
  return { devices: await listDevices() };
});

/** `{ name }` → `{ id, name, token }`. The desktop app calls this right after the password sign-in. */
export const POST = senseHandler(async (actor, request) => {
  requireOwner(actor);
  return createDevice((await jsonBody(request)).name);
});
