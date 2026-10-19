# Stage 1 moderation corrections — 2026-10-13

Base: `9db1f187b37245ddcb257857a8fa1955c2f35d7c`, branch `feat/temple-community-stage1`.

Restoration no longer exposes an author's moderation explanation to other members. Both shared post and reply projections return that field only to the owner; even moderators use the separate authorized operator projection for others' reasons. Own-work export continues to include the requester's own moderation state.

The operator queue now includes link content and image references, distinguishes deleted/unavailable records from contributions with no text, and renders original images through `/api/temple/moderation/media/:id`. That endpoint requires active membership plus the database moderator role, grants access only to reported or hidden undeleted post images, and never exposes unattached drafts. Ordinary image access remains unchanged and denies hidden images to other members, including moderators using ordinary routes.

Migration `008_report_reviews.sql` preserves existing report history and replaces permanent reporter/target uniqueness with a partial unique index for open reports. A resolved review no longer prevents a subsequent report. New reports capture the record version; legacy versions stay NULL because they are unknown. The queue explicitly shows current content and reported/current versions, not a fabricated historical content snapshot. Reporting and resolution share a target advisory lock. The API returns 201 and `reported:true` for a new report, or 200 and `duplicate:true,reported:false` identifying the original open report. UI feedback matches those outcomes.

## Actual local verification

- 74 unit tests passed, including unauthenticated denial for the dedicated moderator media endpoint.
- Two isolated PostgreSQL integration checks passed: the existing community/export suite plus new restoration-privacy, image/link-only review, hidden/draft/expired media boundaries, concurrent open-report deduplication, and report–resolve–edit–report regressions for posts and replies.
- Full lint passed without warnings/errors; full TypeScript passed; production build passed with absent credentials and external fetches blocked. Security patch integrity passed.
- The original complete browser journey passed against the corrected local production build. The new moderation browser regression passed separately, exercising actual HTTP/API/database behavior, new/duplicate report status codes, versioned renewal, owner-only restored reasons, moderator-only originals, image/link rendering, hidden-image reload and desktop/phone axe scans.
- Browser fixtures initially collided with the configured report throttle, and an image-decoding check ran before lazy loading completed. Reporter isolation and a decode wait corrected these test issues; application limits were not bypassed or weakened.
- Migration 008 was applied only to the existing synthetic loopback database. The migration retained the earlier Better Auth `lastRequest` number/int8 warning. No remote migration or fixtures were executed.
- Home page, global layout/navigation, 3D scene, membership/auth/billing and booking libraries, and dependency lockfile remain unchanged.

Local logs: `/tmp/temple-fix-unit.log`, `/tmp/temple-fix-integration.log`, `/tmp/temple-fix-lint.log`, `/tmp/temple-fix-types.log`, `/tmp/temple-fix-build.log`, `/tmp/temple-fix-browser.log`, `/tmp/temple-fix-moderation-browser.log`, `/tmp/temple-fix-migrate.log`.

The hosted preview build does not apply migrations. Hosted member testing still requires approval for an explicitly identified non-production database, authentication configuration, migration 008 and synthetic fixtures. The known Calendar reconciliation gap remains separate and unchanged. No real charges, email, Calendar invitations, new credentials or remote configuration changes were used for these corrections.
