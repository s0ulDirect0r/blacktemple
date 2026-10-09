# Membership platform — local implementation

The draft lives on `feat/membership-platform`, based on main `5d7283d`. Nothing in this membership branch has been committed, pushed, or deployed. The original main worktree and its pre-existing `.gitignore` / `.claude` changes are untouched. `/calls` remains paused.

The local preview is `http://localhost:3002/membership`. Accounts start at `/login`; the member area is `/members`. The original site preview on port 3000 is separate.

The branch now pins Next.js and eslint-config-next to **16.3.8**, a same-major security update from Next 16.1.6. Node 22 and the existing React 19 versions satisfy its supported dependency requirements. The original main worktree retains its previous dependency versions. Earlier verification passed 23 focused tests, an isolated build and 12 desktop/mobile browser views, including a hosted sandbox checkout. The technical cleanup below supersedes the old aggregate-check limitations; earlier hosted-tier evidence is retained separately.

## Implemented offering

Witness is $20 USD per month ($60 total), with the creative archive and one monthly studio dispatch. Companion is $100 per month ($300 total), adding a monthly 60-minute group studio gathering. Champion is $1,000 per month ($3,000 total), adding one private 45-minute conversation each month, either a Desire Confessional or creative championing. These offerings and policies are provisional. Capacities default to Companion 12 and Champion 3 and can be changed with environment variables. The public page makes no scarcity claim.

Studio, Gatherings, Private Conversations, My Membership, and Support have real authenticated pages and APIs. A free account has no paid access. Empty archive/gathering states are honest. No creative work, gathering date, meeting URL, or private appointment has been invented. Conversation and support forms save owned requests; they do not send email or book a calendar time. Contact email links provide the current route to a reply or arranging a conversation. Content/gatherings currently come from the membership tables; a publishing UI is not included.

## Authentication and ownership

Better Auth 1.7.7 uses a separate `/api/member-auth` base path and separate `member_*` tables; the existing admin login is preserved. Passwords have a 12-character minimum. Sessions are database-backed, HttpOnly, SameSite=Lax, secure on HTTPS, and have no client cookie-cache shortcut. Page and API guards query the current session. A proxy cookie check only provides an early redirect. All ownership comes from the authenticated user ID, never a request-supplied ID. Member responses are private/no-store; member pages are noindex.

Mutation APIs validate exact configured origin, JSON objects, tiers and the current consent version. Login return paths are restricted to member routes. Session checks on tab focus and browser history hide expired/other-account data while preserving form input. Database-backed auth and request rate limits are configured.

Email verification is required before session creation or member access. Verification links expire after one hour and are serialized for one-time consumption; reset links expire after 15 minutes and revoke existing sessions. Signup, recovery and resend responses avoid account enumeration. IP and mailbox throttles, exact origins and fixed callbacks protect account flows. Encrypted durable email jobs support bounded retries and lease recovery. Local delivery uses private capture only; Resend delivery code requires explicit sender, scoped credential and sending activation. No real email was sent. Direct billing fixtures bypass UI enrollment only for sandbox lifecycle tests.

## Finite billing and webhook recovery

Checkout uses Stripe hosted **setup mode** to authorize the card, with explicit three-payment consent. It does not create an indefinite subscription. After signed confirmation, the backend creates one Subscription Schedule phase lasting three monthly intervals with `end_behavior=cancel`, **before** collecting the first invoice. The fixed term is stored from Stripe's actual phase dates.

Checkout attempts are durable, owned and resumable. Advisory locks enforce capacity, including open/activating reservations. Idempotency keys and recovery by attempt metadata reuse the same customer, checkout and schedule after interruption, including beyond Stripe's idempotency retention window. A return/success URL never activates access.

The webhook validates the raw body/signature/mode and quickly saves the event to a durable queue. Processing deduplicates event IDs and retrieves canonical Stripe state instead of trusting event ordering. Worker leases reclaim crashes; failures retain queued work with backoff. `after()` starts processing after acknowledgement, and the local worker recovers pending work. `/api/membership/process` is an authenticated scheduling hook guarded by `MEMBERSHIP_JOB_SECRET`; no production scheduler is configured.

Paid access requires an owned USD invoice with the pinned price, quantity, a successful matching card payment and contiguous paid coverage within the fixed term. Failed invoices cannot extend coverage; refunds/disputes revoke access conservatively for review. Actual invoice links, term dates, paid-through dates and the next provider payment date appear in My Membership. One Champion conversation request is permitted per paid invoice month. Cancellation/refund/unused-session business rules still need review.

## Local operation

Use Node 22.12 or a compatible current Node 22 runtime. `.env.membership.example` lists names only. The private `.env.local` configures the dedicated local database `blacktemple_membership_dev_20261009`, sandbox keys, sandbox price IDs and the local auth URL. It is gitignored. Existing production databases and live Stripe credentials have not been modified.

```sh
npm run membership:migrate
npm run dev -- --port 3002
stripe listen --latest --events checkout.session.completed,checkout.session.expired,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed,invoice.payment_action_required,invoice.finalized,subscription_schedule.completed,subscription_schedule.canceled,subscription_schedule.released,charge.refunded,charge.dispute.created,charge.dispute.closed --forward-to http://localhost:3002/api/membership/webhook
npm run membership:worker
```

Put the listener's actual signing secret in `MEMBERSHIP_STRIPE_WEBHOOK_SECRET` before webhook testing. Do not print or commit the secret. Current detached process IDs and logs are in `../artifacts/membership/preview-state.json`; the listener log contains its signing secret and is stored privately. Migrations reject remote database hosts unless explicitly allowed. The CLI worker and lifecycle verifier reject non-local databases or non-test billing.

```sh
node --import tsx --test tests/membership*.test.ts tests/calls-*.test.ts
node --import tsx scripts/verify-membership-stripe.ts
```

The Stripe verifier intentionally creates local fixture users and Stripe sandbox/Test Clock objects. It does not send email or create real bookings. Re-running it creates new fixtures.

## Evidence and limits

The artifact directory `../artifacts/membership` contains the hosted-checkout results, boundary/security verification, capacity/private-content verification, Stripe Test Clock lifecycle report, desktop/mobile screenshots and final browser report. All three hosted tiers completed sandbox card authorization and their first paid invoices. A shared billing-function Test Clock fixture collected exactly three automatic monthly payments and produced no fourth invoice when advanced into month four. Failed-payment recovery, partial refund revocation, expired-term old-event replay, durable retries and lease recovery passed.

Technical cleanup on 2026-10-09 made full repository lint and full TypeScript checking pass without exclusions or suppressions. All 42 unit tests pass. Existing gallery/home tests were repaired through an injectable route helper; deterministic particle initialization preserves the existing visual parameters. The dedicated account integration passed duplicate signup, unverified/unknown login, concurrent verification replay, native expiry/signature checks, ownership/paywall boundaries, reset expiry/replay/session revocation, rate limits, origin/redirect rejection and email-worker lease/expiry recovery. Outgoing email count was zero.

Compatible dependency updates reduced a fresh full audit from 31 findings (24 high, 6 moderate, 1 low) to 12 affected nodes (8 high, 4 moderate), with zero critical findings. The production-only audit has four moderate nodes, no high or critical findings. The remaining root advisories are unpatched `braces` GHSA-vfj7-8cjw-p6xm and `sprintf-js` GHSA-hp3w-g68c-fv3c. Remediation requires reviewed vendoring or broader tooling/parser changes; a blind YAML-major override breaks current APIs. Do not describe this as a clean security audit. Dependency tree validation and Sharp/Tailwind compatibility smoke checks pass.

The deployment procedure is in `history/membership-deployment.md`; the static, secret-safe preflight script checks local, preview and production configuration without network or mutation. Hosted targets intentionally require approved provider email and cannot use capture. No production infrastructure, outgoing delivery, scheduler or live billing was activated. Remaining launch prerequisites include these explicit approvals, chosen hosting/database/TLS/backup setup, production migrations, sender credentials and actual delivery tests, live Stripe prices/webhook, an authenticated recovery scheduler with monitoring, and user review of provisional offerings/policies/content. Existing `bd` is blocked by a historical SQLite migration requirement; its data was preserved.

Final build, rerun billing evidence and the exact changed-file manifest are retained in the private technical cleanup delivery artifacts. Preview state, logs and token-bearing email captures remain private and must not be committed or uploaded with source.

Provider references: [Stripe schedules](https://docs.stripe.com/billing/subscriptions/subscription-schedules), [Stripe Test Clocks](https://docs.stripe.com/billing/testing/test-clocks/api-advanced-usage), [Stripe webhooks](https://docs.stripe.com/webhooks), [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next), [Next.js 16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8), [Windows RCE advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).
