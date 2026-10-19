import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { membershipDatabase } from './database';
import { safeReturnPath } from './config';
import { enqueueAccountEmail, VERIFICATION_SECONDS, RESET_SECONDS } from './email';

export function authConfigured() { return Boolean(process.env.MEMBERSHIP_DATABASE_URL && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL); }
let instance: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  if (!authConfigured()) throw new Error('Membership sign-in is not configured');
  const baseURL = process.env.BETTER_AUTH_URL!;
  return betterAuth({
    appName: 'Black Temple', baseURL, basePath: '/api/member-auth',
    secret: process.env.BETTER_AUTH_SECRET!, database: membershipDatabase(),
    emailAndPassword: {
      enabled: true, minPasswordLength: 12, maxPasswordLength: 128,
      requireEmailVerification: true, autoSignIn: false,
      resetPasswordTokenExpiresIn: RESET_SECONDS, revokeSessionsOnPasswordReset: true,
      sendResetPassword: data => enqueueAccountEmail('reset', data),
      onPasswordReset: async ({user}) => { await membershipDatabase().query("DELETE FROM member_verification WHERE value=$1 AND identifier LIKE 'reset-password:%'",[user.id]); },
    },
    emailVerification: {
      sendOnSignUp: true, sendOnSignIn: false, autoSignInAfterVerification: false,
      expiresIn: VERIFICATION_SECONDS,
      sendVerificationEmail: data => enqueueAccountEmail('verify', data),
    },
    user: { modelName: 'member_user' },
    account: { modelName: 'member_auth_account' },
    verification: { modelName: 'member_verification' },
    session: { modelName: 'member_session', expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    advanced: { cookiePrefix: 'blacktemple_member', useSecureCookies: baseURL.startsWith('https://'), defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' } },
    rateLimit: { enabled: true, storage: 'database', modelName: 'member_rate_limit', window: 60, max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 8 }, '/sign-up/email': { window: 60, max: 5 }, '/request-password-reset': { window: 60, max: 3 }, '/send-verification-email': { window: 60, max: 3 }, '/reset-password': { window: 60, max: 5 }, '/verify-email': { window: 60, max: 10 } } },
    plugins: [nextCookies()],
  });
}
export function memberAuth() { return instance ??= createAuth(); }
export type MemberSession = NonNullable<Awaited<ReturnType<ReturnType<typeof memberAuth>['api']['getSession']>>>;
export async function sessionFromHeaders(requestHeaders: Headers) {
  if (!authConfigured()) return null;
  const session = await memberAuth().api.getSession({ headers: requestHeaders });
  return session?.user.emailVerified ? session : null;
}
export async function memberSession() { return sessionFromHeaders(await headers()); }
export async function requireMemberSession(next = '/members') {
  const session = await memberSession();
  if (!session) redirect('/login?next=' + encodeURIComponent(safeReturnPath(next)));
  return session;
}
