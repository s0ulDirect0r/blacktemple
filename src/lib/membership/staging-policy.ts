/** A hosted sandbox may enroll and email only the explicitly approved test account. */
export function stagingAccountAllowed(email: unknown, env: Readonly<Record<string, string | undefined>> = process.env) {
  if (env.VERCEL_ENV === 'preview' && env.MEMBERSHIP_STAGING_MODE !== 'true') return false;
  if (env.MEMBERSHIP_STAGING_MODE === undefined || env.MEMBERSHIP_STAGING_MODE === 'false') return true;
  if (env.MEMBERSHIP_STAGING_MODE !== 'true' || env.VERCEL_ENV === 'production' || env.MEMBERSHIP_BILLING_MODE !== 'test' || env.MEMBERSHIP_LIVE_ENABLED === 'true') return false;
  const allowed = env.MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT?.trim().toLowerCase();
  return Boolean(allowed && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(allowed) && typeof email === 'string' && email.trim().toLowerCase() === allowed);
}
