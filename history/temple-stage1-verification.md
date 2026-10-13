# Stage 1 verification — 2026-10-13

Actual local execution, not prior documented results. Base: `3559a0ae073321db038bd3030c51f536509e73ae`; branch: `feat/temple-community-stage1`. Remote membership ref was rechecked and remained at that base before commit.

| Check | Result |
| --- | --- |
| Full unit suite, `npm test` | 74 passed, zero failed/skipped |
| Local PostgreSQL integration, `npm run test:temple:integration` | Passed: ownership, duplicate writes, cross-author creation race, stale versions, pagination, private originals, reports/moderation, own-only exports, expiration and deletion |
| New end-to-end browser journey against the final production build | Passed in system Chromium; desktop/phone axe scans, keyboard composer focus, actual auth/API/database/media/export flows |
| Existing `npm run test:a11y` | 10 passed: public pages plus none, pending, Witness, Companion, Champion, past-due, canceled, revoked and expired member states; desktop/phone and focus indicators |
| Full ESLint | Passed, zero warnings/errors |
| Full TypeScript | Passed independently; final build also checked full repository types |
| Production `npm run build` | Passed with absent credentials and external fetches blocked; 61/61 static pages generated |
| Dependency security patch check | Passed; upstream audit findings remain visible, no fresh audit was claimed |
| Community migration and repeated local migration | Passed; repeat emitted Better Auth's existing `lastRequest` number/int8 schema warning |
| Preserved-source diff and whitespace checks | Passed: home/front-door, global layout/navigation, 3D/zones/content, auth/billing/booking libraries, proxy and lockfile unchanged |

The browser checks include an interrupted upload retry and a successful publish with a deliberately lost response. Retrying retains the same UUID and creates one contribution. The final browser run also verifies oversized JSON rejection, spoofed SVG/image rejection, wrong-Origin rejection, unauthorized edits, direct unauthenticated media denial, moderator-hidden media denial, restore completion, avatar/identity changes, own-only ZIP download, original-file hashes and export after paid coverage expires.

An independent Python standard ZIP reader validates CRCs, recovers JSON metadata/bodies and verifies SHA-256 for each original image. The integration comparison preserves stable post/reply IDs, author IDs, timestamps, body line breaks, relations and image hashes; other members' private replies and attachments are excluded. There is no import UI in this stage.

The first new browser run passed against dev. Later repeated checks exposed test-selector ambiguity and a response-timing assumption, which were corrected by scoping selectors to current records and awaiting restored UI state. One dev refresh run timed out under concurrent verification. Final checks passed sequentially against the production build. Final screenshots wait for image decoding and exclude development indicators.

## Evidence in the execution workspace

Screenshots are under `/workspace/artifacts/temple-stage1/`: `membership-desktop.png`, `membership-phone.png`, `shared-temple-desktop.png`, `shared-temple-phone.png`, `identity-export.png`, `moderation-notice.png`, and `expired-access.png`. All depict an explicitly labeled synthetic local preview. The same directory contains a synthetic export and manifest used for validation.

Logs: `/tmp/temple-stage1-unit.log`, `/tmp/temple-stage1-lint.log`, `/tmp/temple-stage1-types.log`, `/tmp/temple-stage1-build.log`, `/tmp/temple-stage1-integration.log`, `/tmp/temple-stage1-browser.log`, `/tmp/temple-baseline-a11y.log`, `/tmp/temple-migrate.log`, `/tmp/temple-migrate-repeat.log`. These are execution artifacts, not source deliverables or a promise of permanent hosting.

The review runtime uses a temporary embedded PostgreSQL package under `/tmp`, listening only on loopback, synthetic native accounts, and the existing dependency lockfile. A blocked Playwright browser download was bypassed by using the already-installed system Chromium; no permissions or paid services were added. Browser/integration tests are guarded against remote targets. Provider fetches were blocked in the local server. No outgoing account emails, Stripe operations, Calendar invitations, production records or deployments were used.

## Limits and remaining decisions

Library brief version 7 was fully read, but its two supported materialization attempts failed; no readable downloaded brief is claimed. `bd` is absent, so issue state was left untouched.

No hosted/runtime/provider integration, production migration, real moderator grant, fresh security audit, live payment, email or Calendar verification was performed. Native database image storage and the initial 64 MiB author cap need hosting-capacity review. The patronage-use plan and final commercial benefit allocation remain drafts. The known booking reconciliation risk remains outside this implementation. Public publishing, streams/seasons/world changes, agent delegation, rewards and crypto remain later stages.

No push, merge or deployment is authorized by these local results. Review preview-publication behavior and obtain approval before any push that would publish a hosted preview.
