# Paid-member Temple arrival

Implemented October 15, 2026, on `codex/temple-arrival`, based on community commit `2bac3c9`. Initial arrival commit: `486db5c34427ee42dd767b5b70616a686b976cac`. Current application commit with the compact composer: `7b727ef3617cea0bf1e19df242265b1f23dbdec5`.

## Sandbox

- Review: https://blacktemple-membership-sandbox.vercel.app/membership/welcome
- Vercel project: `blacktemple-membership-test` (`prj_clGFGAA3ElKL6sH4MLdiYw4jjSIK`).
- READY compact composer Preview deployment: `dpl_A9HdqdKwVttTe6ehBi2QpGnJn3nc`.
- Deployment URL: https://blacktemple-membership-test-hd0913v5v-anansis-projects.vercel.app
- Only the sandbox alias is updated; its previous target was `dpl_DsYX3Jjh4Ztp1da9oaH5k6B7fHnJ`. Other existing aliases, environment values/scopes, and security settings are preserved.
- Database remains the separate `blacktemple-membership-sandbox` Neon store (`store_0nh6RmW1yJz6jBD2`, external project `icy-paper-04060838`). Migrations 001–008 remain in place; no migration was needed or run remotely.

## Behavior

The checkout return polls the authenticated membership record. Only confirmed paid access opens `/membership/welcome`. It preserves the return URL across sign-in and offers a manual confirmation retry after a slow response.

The welcome includes a clearly labeled video placeholder and written message. A new member chooses a Temple name, edits the suggested unique alias if desired, and optionally selects a JPEG/PNG/WebP portrait up to 20 MiB and 24 megapixels. A local editor frames the picture with drag, zoom and position sliders. A circular preview shows its avatar appearance; only the applied 512 × 512 PNG crop is uploaded, within the server’s 3 MiB arrival limit. The portrait has an optional description. No video or third-party player is loaded.

`POST /api/temple/arrival` checks the exact origin, native authentication, paid entitlement, request bounds, alias constraints and decoded image bytes. Identity, cropped image and avatar attachment commit in one transaction. The billing and author locks protect the paid check and concurrent setup. A retry of the same successfully committed name/alias/media identifier returns the same profile. Failed images and alias conflicts leave no partial identity or image.

After a short doorway animation, the member enters the shared feed with their chosen name and portrait. Reduced-motion users enter immediately. Quiet entry is available without creating a profile. Existing identities skip the creation ceremony; Identity & export remains the editing interface. Account/billing identity is unchanged.

## Verification

- All 74 existing unit tests passed before the final route-type correction. The changed access tests (9) and Temple tests (7) passed afterward; Temple's 7 tests were rerun after the correction.
- TypeScript and changed-file ESLint passed. Fixed a pre-existing unsupported named helper export from the Temple route, surfaced by Next 16 generated route types, and updated tests to use the supported POST export.
- Two complete local browser journeys passed against a new loopback-only PostgreSQL database and native email/password sign-in. Covered delayed paid confirmation, paid-only welcome, name/alias suggestions, malformed images, atomic rollback on alias conflict, lost-response retry, avatar byte hashes/privacy, persistence after refresh, existing-identity redirect, quiet entry/resume, optional pictures and unpaid denial.
- Accessibility audits passed on the welcome at 390px and the feed at 320px; no horizontal overflow. Tests use synthetic identities and synthetic paid-entitlement records. They do not call Stripe or send email or Calendar invitations.
- Hosted preview and stable alias checks confirmed anonymous welcome redirects to sign-in with the correct return path, anonymous setup returns 401, and foreign-origin setup returns 403. Existing sandbox account record counts and configuration/security hashes remained unchanged.
- Hosted fresh Stripe checkout and authenticated avatar creation were not repeated. The complete post-payment story was tested locally with synthetic entitlement; hosted checks verified deployment and access boundaries. No real or test provider charge was created for this work.

The feature branch is separate from `feat/one-time-support`. Nothing was merged to main or released to the public production site.

## Coalescing confirmation portal

Follow-up application commit `852148d95bd80b600728e50dfe5bdf2edf45f826` replaces the plain confirmation panel with inward-spiraling sparks and a fluid, uneven portal membrane. The canvas runs at 30 frames per second, caps its pixel ratio at two, and stops drawing in a hidden tab. Reduced-motion preference produces a still portal.

Only verified paid access opens the portal and navigates to the existing identity invitation. Normal motion uses a 700 ms crossing; reduced motion proceeds immediately. Prefetch starts only after paid access is confirmed, avoiding a cached unpaid redirect. The continuation link remains usable if navigation is interrupted; the temporary crossing layer clears itself. Slow confirmation retains the explicit retry and account links.

Three local end-to-end journeys passed: moving portal and confirmed crossing through avatar creation; static reduced-motion portal and actual delayed-confirmation retry; optional portrait, quiet entry/resume and unpaid denial. TypeScript, changed-file ESLint, mobile overflow and accessibility checks passed. The local test fixture now verifies its actual database matches the explicit loopback test database before resetting leftover synthetic login throttles. No hosted memberships or billing state are changed for this visual update.

Final hosted read-back verified the new sandbox alias, unchanged other aliases, unchanged environment and security hashes, unchanged account record counts, and the same anonymous/foreign-origin access denials. No remote schema or provider operation was performed. Temporary local preview and PostgreSQL services were stopped after verification.

## Avatar framing

The shared AvatarPicker works during paid arrival and in Identity & export. It supports mouse/touch dragging, 1–4× zoom, independent horizontal/vertical controls, arrow-key positioning with larger Shift steps, reset, cancel and an explicit Use this crop action. Parent submission is blocked while an unapplied crop is open. Applying preserves the local source for readjustment; cancel restores the committed framing. Only the cropped copy leaves the browser. Source signatures, decode success, byte and pixel limits are checked before editing, while existing server image validation remains in place.

Two crop invariant/header unit tests, TypeScript and changed-file ESLint passed. Local authenticated browser checks covered source selection, keyboard and pointer framing, mobile accessibility/overflow, cancel/recrop, arrival retry/atomic rollback, exact saved 512 × 512 dimensions and selected pixel colors, existing profile avatar replacement without changing profile identity, optional portraits, quiet entry and paid-access boundaries. These use disposable loopback data, with no Stripe operation.

The existing community browser journey also passed, including offering image uploads, moderation, profile editing and portable exports. Generic offering image uploads continue to preserve their original bytes.

Hosted checks on the READY crop deployment and reassigned stable sandbox alias passed: welcome redirects correctly, anonymous arrival is 401 and foreign-origin arrival is 403. The account still has one membership and one profile; configuration/security hashes and every other alias stayed unchanged. No hosted account or provider mutations were performed. Temporary local services were stopped after verification.

## Compact posting and identity transition captures

The offering composer now starts as a compact expanding text area with Image, Link and Preview controls and one Post action. Links appear on demand. Up to four images can be selected together; their previews, descriptions and removal controls appear only after selection. Post uploads chosen originals and then saves the contribution. Stable image/post IDs and retained successful upload results support retries without duplicates. The Machine checkbox retains the original optional participation behavior. Ctrl/Cmd+Enter posts, and empty submissions are disabled. No schema, server permissions or billing changes.

TypeScript and changed-file ESLint passed. The complete local community journey passed, covering interrupted upload and lost post confirmation retries, moderation, editing, avatars, original-media byte preservation and own-work exports. A targeted compact composer journey passed at 390px/320px with accessibility/overflow audits, optional link removal, multiple image selection/removal and keyboard posting. The authenticated arrival journey also passed and captured actual transition stages.

The existing transition is unchanged for review: after successful identity setup, a separate identity-ready panel appears for 650 ms; navigation then replaces the welcome layout with the member layout, a second personalized welcome, and Feed's client loading state before the final invitation/contributions. The screenshot test pauses the timer and gates the feed response to expose these otherwise short views. These are synthetic local accounts, not screenshots of Matthew's private account. The local preview badge and local developer UI do not represent sandbox production content.

Screenshot gallery: `/Users/matthewhuff/.codex/visualizations/2026/10/15/01a140f1-1591-74e1-adf5-12c221db988d/temple-submission-review.html`. Original captures remain under its adjacent `temple-submission/` directory; this gallery also includes desktop/phone composer images.

The compact composer Preview reached READY and the stable sandbox alias was reassigned to it. Hosted access-boundary checks passed before and after; membership/profile counts, environment and security hashes and all other aliases stayed unchanged. Temporary local services were stopped after verification.
