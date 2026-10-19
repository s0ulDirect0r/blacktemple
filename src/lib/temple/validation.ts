import { MemberError } from '@/lib/membership/errors';

export const REACTIONS = ['spark', 'resonance', 'wonder'] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export function invalid(message: string): never { throw new MemberError(400, message); }
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) invalid('Invalid record identifier.');
  return value;
}
export function text(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid(`${label} must be ${min}–${max} characters.`);
  return value.trim();
}
export function webLink(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = text(value, 1, 2048, 'Link');
  let url: URL; try { url = new URL(raw); } catch { return invalid('Use a complete http or https link.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) invalid('Use an http or https link without credentials.');
  return url.href;
}
export function profileInput(body: Record<string, unknown>) {
  const name = text(body.name, 2, 80, 'Temple name');
  const alias = text(body.alias, 3, 30, 'Alias').toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(alias)) invalid('Alias uses lowercase letters, numbers, underscores and hyphens.');
  return { name, alias, persona: text(body.persona ?? '', 0, 1200, 'Creative persona'), avatarId: body.avatarId ? uuid(body.avatarId) : null };
}
export function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) invalid('Include the current version.');
  return Number(value);
}
export function postInput(body: Record<string, unknown>) {
  const content = text(body.body ?? '', 0, 12000, 'Offering');
  const link = webLink(body.link);
  if (!Array.isArray(body.mediaIds ?? [])) invalid('Images must be a list.');
  const mediaIds = ((body.mediaIds ?? []) as unknown[]).map(uuid);
  if (mediaIds.length > 4 || new Set(mediaIds).size !== mediaIds.length) invalid('Choose up to four different images.');
  if (!content && !link && !mediaIds.length) invalid('Bring a fragment, image or link.');
  if (body.offering !== undefined && typeof body.offering !== 'boolean') invalid('Offering must be true or false.');
  return { body: content, link, mediaIds, offering: body.offering === true };
}
export function pageCursor(value: string | null) {
  if (!value) return null;
  try {
    const [date, id] = JSON.parse(Buffer.from(value, 'base64url').toString());
    if (typeof date !== 'string' || !Number.isFinite(Date.parse(date))) invalid('Invalid page cursor.');
    return [new Date(date), uuid(id)] as const;
  } catch { return invalid('Invalid page cursor.'); }
}
export function filename(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g,'_').replace(/^[_\.]+/, '').slice(0, 100) || 'image'; }
