import { requireFeature } from '@/lib/membership/content';
import { bookConversation, conversationBookings, conversationSlots, parseConversationRequest } from '@/lib/membership/conversations';
import { authenticated, errorResponse, jsonObject, MemberError, privateJson } from '@/lib/membership/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await authenticated(request);
    await requireFeature(session.user.id, 'conversations');
    let slots: Date[];
    try { slots = await conversationSlots(); }
    catch { console.error('[membership] conversation slots unavailable'); throw new MemberError(503, 'Open times could not be loaded. Please try again in a moment.'); }
    return privateJson({ slots: slots.map(slot => slot.toISOString()), bookings: await conversationBookings(session.user.id) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await authenticated(request, true);
    const booking = await bookConversation(session.user, parseConversationRequest(await jsonObject(request)));
    return privateJson(booking, 201);
  } catch (error) { return errorResponse(error); }
}
