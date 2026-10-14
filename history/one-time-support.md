# Optional one-time support

Implementation branch: `feat/one-time-support`, based on community commit
`2bac3c9553cafa60e49519749b1612ffb882fde9`. At inspection on October 14, 2026,
`main` was `5d7283d3f9c22d9e698563cd26c7a5c9b79d66b3` and was an ancestor of
that community commit. This base retains all current main work and the unmerged
membership/community work; review this change relative to the community branch.

## Behavior

The homepage keeps its scene and navigation geometry, with one small HTML support
link in its lower-right corner. The site navigation also links to `/support`.
That standalone page uses the existing black background, pixel headings, muted
text and simple borders. Support requires no account. The amount is blank until
the visitor chooses it: $1–$1,000 USD, at most two decimal places, with validation
on both the client and server. These limits are initial guardrails, not approved
suggested contribution amounts.

Stripe Checkout uses `mode: payment`, a single fixed-quantity line item and cards.
It creates no subscription, saves no card for future use, and binds no member or
membership customer. Checkout and the site explicitly describe one optional
payment without membership, services or rewards. A request UUID gives retries of
a lost checkout response the same Stripe idempotency key.

The shared existing Stripe client (`membershipStripe`) retains its test/live
safety gates. The existing `/api/membership/webhook` signature verification and
durable event queue are reused. Support session events are handled before any
membership transaction; only canonical paid USD support sessions with matching
metadata and mode can be recorded. A separate `support_payments` ledger has unique
session and payment-intent references and stores no supporter email or account ID.
Duplicate event IDs are deduplicated by the existing queue; different events and
page/webhook races are deduplicated by the ledger. Worker failures retain the
existing retry/recovery behavior. Refunds remain managed in Stripe; the ledger is
a record of original payments, not a computed current net balance.

The success page retrieves Stripe state rather than trusting the redirect. Missing,
foreign and unpaid sessions never receive a thank-you confirmation. If a payment
is verified but recording fails, the page acknowledges payment and says not to pay
again. Provider lookup outages likewise advise refreshing rather than repaying.
Confirmation pages are dynamic, noindex/nofollow, and use a no-referrer policy.

## Setup before enabling

`SUPPORT_CHECKOUT_ENABLED=false` is the default. No new Stripe product, price,
account, signing secret, credential, database service or subscription is needed.

Use the already authorized test configuration for the existing sandbox project
`blacktemple-membership-test` (`prj_clGFGAA3ElKL6sH4MLdiYw4jjSIK`, team
`team_l9FQIl3LQzYwGSs0COI8yizM`). It is a Vercel project, not a named Vercel
Sandbox. Existing private configuration must include `MEMBERSHIP_DATABASE_URL`,
`MEMBERSHIP_STRIPE_SECRET_KEY`, `MEMBERSHIP_BILLING_MODE=test`,
`MEMBERSHIP_STRIPE_WEBHOOK_SECRET`, and `BETTER_AUTH_URL` set to the exact checkout
site origin. No secrets are included in this branch.

Apply `migrations/membership/009_support.sql` to the approved test database. The
existing `npm run membership:migrate` runner also applies it (remote migrations
need its explicit `--allow-remote` switch). Checkout checks the support table
exists before creating a payment session. The existing signed webhook must receive
`checkout.session.completed`; also subscribe to
`checkout.session.async_payment_succeeded` if it does not already. Keep the existing
worker/recovery schedule for delayed queue retries. This does not require opening
membership checkout: its activation flag is independent.

After setup, set `SUPPORT_CHECKOUT_ENABLED=true` in the approved test environment,
run a Stripe test payment, test cancellation/decline, replay the signed event, and
check that the support ledger has one record and memberships are unchanged.
Real Stripe verification and any sandbox deployment/configuration remain pending;
this execution environment had no existing payment secrets or database connection.
No credentials were created or retrieved, and no remote schema was changed.

Production release, live activation, merge, real payments, paid services and any
new credential/access setup require separate approval. Nothing was deployed or
merged by this implementation.

## Local verification

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
`npm run test:support:browser` starts a dedicated local server with support enabled;
use `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium` where the bundled browser is not
installed. Its checkout navigation uses an explicit browser fixture, not a live
Stripe session.

The payment suite covers amount boundaries and precision, checkout parameters,
foreign/unpaid/mismatched payment rejection, success-page outages, signature
rejection, HTTP validation, and retry keys. PGlite (development dependency only)
runs the actual PostgreSQL support/queue migrations and SQL to verify concurrent
confirmations, unique constraints, duplicate events, failed-job retry/recovery and
zero membership creation. Browser checks cover mobile/desktop custom amounts,
error recovery, Stripe redirect handoff, keyboard homepage navigation,
cancellation, unverified confirmations, and WCAG A/AA checks with axe.

References used: installed Next.js 16.3.8 route/page guides under
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`,
[Stripe Checkout create](https://docs.stripe.com/api/checkout/sessions/create), and
[Stripe idempotency](https://docs.stripe.com/api/idempotent_requests).
