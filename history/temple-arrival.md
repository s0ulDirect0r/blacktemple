# Paid-member Temple arrival

Implemented October 15, 2026, on `codex/temple-arrival`, based on community commit `2bac3c9`. Application commit: `486db5c34427ee42dd767b5b70616a686b976cac`.

## Sandbox

- Review: https://blacktemple-membership-sandbox.vercel.app/membership/welcome
- Vercel project: `blacktemple-membership-test` (`prj_clGFGAA3ElKL6sH4MLdiYw4jjSIK`).
- READY Preview deployment: `dpl_2FCdR6JXh3iC1e9ewVFcnR4zT4KK`.
- Deployment URL: https://blacktemple-membership-test-czemequwv-anansis-projects.vercel.app
- Only the sandbox alias moved; its previous target was `dpl_9GH5aAP6z5QYEh2ezkMZ6F6ee4HZ`. Other existing aliases, environment values/scopes, and security settings were read back unchanged.
- Database remains the separate `blacktemple-membership-sandbox` Neon store (`store_0nh6RmW1yJz6jBD2`, external project `icy-paper-04060838`). Migrations 001–008 remain in place; no migration was needed or run remotely.

## Behavior

The checkout return polls the authenticated membership record. Only confirmed paid access opens `/membership/welcome`. It preserves the return URL across sign-in and offers a manual confirmation retry after a slow response.

The welcome includes a clearly labeled video placeholder and written message. A new member chooses a Temple name, edits the suggested unique alias if desired, and optionally selects a still JPEG/PNG/WebP portrait up to 3 MiB. The portrait has a local preview and an optional description. No video or third-party player is loaded.

`POST /api/temple/arrival` checks the exact origin, native authentication, paid entitlement, request bounds, alias constraints and decoded image bytes. Identity, original image and avatar attachment commit in one transaction. The billing and author locks protect the paid check and concurrent setup. A retry of the same successfully committed name/alias/media identifier returns the same profile. Failed images and alias conflicts leave no partial identity or image.

After a short doorway animation, the member enters the shared feed with their chosen name and portrait. Reduced-motion users enter immediately. Quiet entry is available without creating a profile. Existing identities skip the creation ceremony; Identity & export remains the editing interface. Account/billing identity is unchanged.

## Verification

- All 74 existing unit tests passed before the final route-type correction. The changed access tests (9) and Temple tests (7) passed afterward; Temple's 7 tests were rerun after the correction.
- TypeScript and changed-file ESLint passed. Fixed a pre-existing unsupported named helper export from the Temple route, surfaced by Next 16 generated route types, and updated tests to use the supported POST export.
- Two complete local browser journeys passed against a new loopback-only PostgreSQL database and native email/password sign-in. Covered delayed paid confirmation, paid-only welcome, name/alias suggestions, malformed images, atomic rollback on alias conflict, lost-response retry, avatar byte hashes/privacy, persistence after refresh, existing-identity redirect, quiet entry/resume, optional pictures and unpaid denial.
- Accessibility audits passed on the welcome at 390px and the feed at 320px; no horizontal overflow. Tests use synthetic identities and synthetic paid-entitlement records. They do not call Stripe or send email or Calendar invitations.
- Hosted preview and stable alias checks confirmed anonymous welcome redirects to sign-in with the correct return path, anonymous setup returns 401, and foreign-origin setup returns 403. Existing sandbox account record counts and configuration/security hashes remained unchanged.
- Hosted fresh Stripe checkout and authenticated avatar creation were not repeated. The complete post-payment story was tested locally with synthetic entitlement; hosted checks verified deployment and access boundaries. No real or test provider charge was created for this work.

The feature branch is separate from `feat/one-time-support`. Nothing was merged to main or released to the public production site.
