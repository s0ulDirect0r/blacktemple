import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

const ISSUER = 'blacktemple';
const AUDIENCE = 'blacktemple-admin';

// Tokens are signed with JWT_SECRET when set, so the login password and the
// signing key can be rotated independently. Falls back to ADMIN_SECRET.
function signingKey() {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_SECRET;
  if (!secret) throw new Error('Admin auth is not configured');
  return new TextEncoder().encode(secret);
}

export function isAdminSecret(candidate: unknown) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof candidate !== 'string' || !candidate) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}

export async function createAdminToken() {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(nanoid())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(signingKey());
}

export async function verifyAdminRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  try {
    await jwtVerify(authHeader.slice('Bearer '.length), signingKey(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return true;
  } catch {
    return false;
  }
}
