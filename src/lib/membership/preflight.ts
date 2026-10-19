import { isAbsolute, normalize, sep } from 'node:path';

export type DeploymentTarget = 'local' | 'preview' | 'production';
export type PreflightResult = { target: DeploymentTarget; ok: boolean; errors: string[]; warnings: string[] };

const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
/** Static configuration validation only: never contacts providers or returns values. */
export function membershipPreflight(env: Readonly<Record<string, string | undefined>>, target: DeploymentTarget): PreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required = (name: string) => {
    if (!env[name]?.trim()) errors.push(`${name} is required.`);
  };
  const strong = (name: string) => {
    required(name);
    if (env[name] && env[name]!.length < 32) errors.push(`${name} must have at least 32 characters.`);
  };
  const url = (name: string) => {
    required(name);
    try { return env[name] ? new URL(env[name]!) : null; }
    catch { errors.push(`${name} must be a valid URL.`); return null; }
  };
  if (target === 'preview' && env.MEMBERSHIP_STAGING_MODE !== 'true') errors.push('Hosted preview requires explicit staging account restrictions.');
  if (env.MEMBERSHIP_STAGING_MODE && !['true','false'].includes(env.MEMBERSHIP_STAGING_MODE)) errors.push('MEMBERSHIP_STAGING_MODE must be true or false.');
  if (env.MEMBERSHIP_STAGING_MODE === 'true') {
    if (target === 'production' || env.VERCEL_ENV === 'production' || env.MEMBERSHIP_BILLING_MODE !== 'test' || env.MEMBERSHIP_LIVE_ENABLED === 'true') errors.push('Staging account restrictions require non-production test billing.');
    if (!env.MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT.trim())) errors.push('Staging requires one explicitly approved email recipient.');
  }
  const authURL = url('BETTER_AUTH_URL');
  if (authURL) {
    if (!['http:', 'https:'].includes(authURL.protocol) || authURL.username || authURL.password || authURL.search || authURL.hash || authURL.pathname !== '/') errors.push('BETTER_AUTH_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
    if (target !== 'local' && (authURL.protocol !== 'https:' || loopback.has(authURL.hostname))) errors.push('Hosted authentication requires a public HTTPS origin.');
    if (target === 'local' && !loopback.has(authURL.hostname)) errors.push('Local verification requires a loopback authentication origin.');
  }
  const dbURL = url('MEMBERSHIP_DATABASE_URL');
  if (dbURL) {
    if (!['postgres:', 'postgresql:'].includes(dbURL.protocol)) errors.push('MEMBERSHIP_DATABASE_URL must use PostgreSQL.');
    if (target === 'local' && !loopback.has(dbURL.hostname)) errors.push('Local verification requires a loopback membership database.');
    if (target !== 'local' && (loopback.has(dbURL.hostname) || !['require', 'verify-ca', 'verify-full'].includes(dbURL.searchParams.get('sslmode') ?? ''))) errors.push('Hosted membership database must be remote with explicit required TLS.');
  }
  strong('BETTER_AUTH_SECRET');
  strong('MEMBERSHIP_JOB_SECRET');
  const key = env.MEMBERSHIP_STRIPE_SECRET_KEY ?? '';
  required('MEMBERSHIP_STRIPE_SECRET_KEY');
  if (key && !/^(sk|rk)_(test|live)_/.test(key)) errors.push('MEMBERSHIP_STRIPE_SECRET_KEY has an unsupported format.');
  const mode = env.MEMBERSHIP_BILLING_MODE;
  if (!['test', 'live'].includes(mode ?? '')) errors.push('MEMBERSHIP_BILLING_MODE must be test or live.');
  if (key && /^(sk|rk)_(test|live)_/.test(key) && !key.startsWith(`sk_${mode}_`) && !key.startsWith(`rk_${mode}_`)) errors.push('Stripe key and membership billing mode must agree.');
  if (target !== 'production' && (mode === 'live' || env.MEMBERSHIP_LIVE_ENABLED === 'true')) errors.push('Local and preview targets must not enable live membership billing.');
  if (mode === 'live' && (target !== 'production' || env.VERCEL_ENV !== 'production' || env.MEMBERSHIP_LIVE_ENABLED !== 'true')) errors.push('Live billing requires production target, VERCEL_ENV=production and explicit MEMBERSHIP_LIVE_ENABLED=true.');
  required('MEMBERSHIP_STRIPE_WEBHOOK_SECRET');
  if (env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET && !env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) errors.push('Membership webhook signing secret has an unsupported format.');
  const prices = ['WITNESS', 'COMPANION', 'CHAMPION'].map(tier => {
    const name = `MEMBERSHIP_PRICE_${tier}`;
    required(name);
    if (env[name] && !env[name]!.startsWith('price_')) errors.push(`${name} must be a Stripe price ID.`);
    return env[name];
  }).filter(Boolean);
  if (new Set(prices).size !== prices.length) errors.push('Membership tiers must use separate price IDs.');
  for (const tier of ['COMPANION', 'CHAMPION']) {
    const name = `MEMBERSHIP_CAPACITY_${tier}`;
    if (env[name] && (!/^\d+$/.test(env[name]!) || Number(env[name]) < 1 || !Number.isSafeInteger(Number(env[name])))) errors.push(`${name} must be a positive safe integer.`);
  }
  if (env.MEMBERSHIP_CHECKOUT_ENABLED && !['true', 'false'].includes(env.MEMBERSHIP_CHECKOUT_ENABLED)) errors.push('MEMBERSHIP_CHECKOUT_ENABLED must be true or false.');
  if (target !== 'local' && env.MEMBERSHIP_EMAIL_MODE !== 'resend') errors.push('Hosted targets require provider email delivery; capture mode is local only.');
  if (target === 'local' && env.MEMBERSHIP_EMAIL_MODE !== 'capture') errors.push('Local verification requires captured email without outgoing delivery.');
  if (env.MEMBERSHIP_EMAIL_MODE === 'resend') {
    required('MEMBERSHIP_EMAIL_RESEND_API_KEY');
    required('MEMBERSHIP_EMAIL_FROM');
    if (env.MEMBERSHIP_EMAIL_SEND_ENABLED !== 'true') errors.push('Provider email sending requires explicit MEMBERSHIP_EMAIL_SEND_ENABLED=true after outgoing-delivery approval.');
    for (const name of ['MEMBERSHIP_EMAIL_FROM', 'MEMBERSHIP_EMAIL_REPLY_TO']) {
      const value = env[name];
      if (value && (/[\r\n]/.test(value) || !/^(?:[^<>\r\n]+<)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(value.trim()) || value.includes('<') !== value.endsWith('>'))) errors.push(`${name} must be a single valid email address without newlines.`);
    }
  }
  if (env.MEMBERSHIP_EMAIL_MODE === 'capture') {
    required('MEMBERSHIP_EMAIL_CAPTURE_DIR');
    if (env.MEMBERSHIP_EMAIL_CAPTURE_DIR && !isAbsolute(env.MEMBERSHIP_EMAIL_CAPTURE_DIR)) errors.push('MEMBERSHIP_EMAIL_CAPTURE_DIR must be an absolute private directory.');
    if (env.MEMBERSHIP_EMAIL_CAPTURE_DIR && normalize(env.MEMBERSHIP_EMAIL_CAPTURE_DIR).split(sep).some(part => ['public', '.next', 'out'].includes(part))) errors.push('Email capture must not use public, .next or out directories.');
    if (target !== 'local' || env.VERCEL_ENV === 'production' || !authURL || !loopback.has(authURL.hostname) || !dbURL || !loopback.has(dbURL.hostname)) errors.push('Email capture requires local loopback auth/database and a non-production environment.');
  }
  warnings.push('Static checks do not verify database connectivity/schema, TLS certificates, Stripe price amounts/mode, webhook delivery, email domain delivery, scheduler operation, or provider permissions.');
  if (env.MEMBERSHIP_CHECKOUT_ENABLED !== 'true') warnings.push('Membership checkout remains disabled.');
  if (mode !== 'live') warnings.push('Stripe remains in test mode; this is not live billing readiness.');
  if (target === 'production' && !env.CRON_SECRET) warnings.push('CRON_SECRET is not set; the queue recovery cron will be rejected.');
  if (target !== 'local' && !env.MEMBERSHIP_OPS_ALERT_EMAIL) warnings.push('MEMBERSHIP_OPS_ALERT_EMAIL is not set; queue alerts are only written to logs.');
  return { target, ok: errors.length === 0, errors, warnings };
}
