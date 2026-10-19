import { randomUUID } from 'node:crypto';
import { hasAccess, type Feature } from './config';
import { membershipDatabase, lock, transaction } from './database';
import { MemberError } from './errors';
import { currentMembership, type Invoice } from './store';

export async function requireFeature(userId: string, feature: Feature) {
  const membership = await currentMembership(userId);
  if (!hasAccess(membership, feature)) throw new MemberError(403, 'Your current membership does not include this space.');
  return membership!;
}
export async function studioForMember(userId: string) {
  await requireFeature(userId, 'studio');
  return (await membershipDatabase().query<{ id: string; title: string; category: string; body: string; published_at: Date }>('SELECT id,title,category,body,published_at FROM member_studio_entries ORDER BY published_at DESC')).rows;
}
export async function gatheringsForMember(userId: string) {
  await requireFeature(userId, 'gatherings');
  return (await membershipDatabase().query<{ id: string; title: string; description: string; starts_at: Date; ends_at: Date; meeting_url: string | null }>('SELECT * FROM member_gatherings WHERE ends_at>NOW() ORDER BY starts_at')).rows;
}
export async function serviceRequests(userId: string) {
  return (await membershipDatabase().query<{ id: string; kind: string; topic: string; message: string; status: string; created_at: Date }>('SELECT id,kind,topic,message,status,created_at FROM member_service_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30', [userId])).rows;
}
export async function createServiceRequest(userId: string, kind: 'support' | 'conversation', topic: string, message: string) {
  if (message.trim().length < 10 || message.length > 4000 || topic.trim().length < 1 || topic.length > 120) throw new MemberError(400, 'Include a topic and a message between 10 and 4,000 characters.');
  return transaction(async client => {
    await lock(client, 'member-service:' + userId);
    if (Number((await client.query<{ count: string }>("SELECT COUNT(*) FROM member_service_requests WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 day'", [userId])).rows[0].count) >= 15) throw new MemberError(429, 'Please wait before sending another request.');
    let membershipId: string | null = null, periodStart: Date | null = null;
    if (kind === 'conversation') {
      const membership = await currentMembership(userId, client);
      if (!hasAccess(membership, 'conversations')) throw new MemberError(403, 'Private conversations are included with an active Champion membership.');
      membershipId = membership!.id;
      const invoice = (await client.query<Invoice>("SELECT * FROM membership_invoices WHERE membership_id=$1 AND status='paid' AND period_start<=NOW() AND period_end>NOW() ORDER BY period_start DESC LIMIT 1", [membershipId])).rows[0];
      if (!invoice) throw new MemberError(403, 'A paid membership month is needed to request a conversation.');
      periodStart = invoice.period_start;
      if ((await client.query("SELECT 1 FROM member_service_requests WHERE membership_id=$1 AND kind='conversation' AND period_start=$2", [membershipId,periodStart])).rowCount) throw new MemberError(409, 'You already have a conversation request for this membership month. Use support if you need to change it.');
    }
    const id = randomUUID();
    await client.query('INSERT INTO member_service_requests(id,user_id,membership_id,kind,topic,message,period_start) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,userId,membershipId,kind,topic.trim(),message.trim(),periodStart]);
    return { id, status: 'received' };
  });
}
