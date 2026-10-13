# Stage 1: the private shared Temple

Built from `3559a0ae073321db038bd3030c51f536509e73ae` on `feat/temple-community-stage1`, following Black Temple build brief version 7, Library identity `libfile_11f97db512bc8191884261bdfd3fa2cd`. The complete brief was read through Library; both supported materialization attempts failed in this executor. No downloaded local brief is claimed.

## Scope and preserved boundaries

The membership offering explains the Temple, Anansi's three motives, the wider vision, and a separate explicitly unfinished patronage-use plan. Existing prices and three-payment meaning are retained. Existing tier benefit language remains an identified commercial draft. Testimonials render nothing unless actual permission-approved quotes are supplied.

The shared feed, profiles, comments, reactions, reports, moderation and own-work exports extend the existing member area. The publisher archive remains at `/members`. All active existing tiers provisionally enter the shared room through the existing `studio` entitlement. This is an implementation policy for owner review, not a finalized new benefit allocation.

No home page, front-door scene, site navigation, unrelated page, billing/authentication library, booking library, production configuration, provider credential, price or deployment changed. The previously identified Calendar reconciliation gap remains unresolved and outside Stage 1.

## Setup

Install the existing lockfile with `npm ci`; the repository's dependency patch script must run if install scripts are disabled. Apply `npm run membership:migrate` against a reviewed target. This adds migration `007_community.sql`; Better Auth and the previous membership migrations are prerequisites. Remote migration requires separate target authorization and the existing explicit `--allow-remote` flow.

No new provider is required: originals are stored as PostgreSQL `BYTEA`. Each still PNG/JPEG/WebP is at most 8 MiB and 24 million pixels; a post can contain four images. The initial per-author media cap is 64 MiB, including avatars and drafts. These operational limits are separate from prices and should be reviewed against hosting/database capacity before production. Original files and their metadata are retained unchanged. Large deployments may later move bytes behind a private object-storage adapter without changing community IDs or the media API.

Moderation authority comes only from `temple_moderators`, keyed to an existing authenticated user's private account ID. There is no automatic role assignment by email, alias, tier or client input. An authorized operator must review the account and grant this role in the chosen target. No real role grants were made here. Moderators currently also require active membership to enter the room.

## Privacy and ownership contracts

`temple_profiles.id` is the stable community author UUID. Private `user_id` links to Better Auth only on the server. The chosen name, unique lowercase alias, optional avatar and persona can change independently of auth/billing names. Public-to-members identity projections never select email, billing name, Stripe IDs or private account ID.

Shared reads and writes require a verified session and current paid coverage. Media always passes through `/api/temple/media/:id` with session verification and private/no-store headers; Next Image uses `unoptimized` so originals never enter the public optimizer. Unattached files are visible only to their author. Moderator-hidden post media is denied to other members. An authenticated author can retrieve their own originals after paid access ends, supporting their export. Account administrators can connect community identity to billing, and shared content may identify a person; complete anonymity is not promised.

Writes validate exact Origin, content type and request bounds. Image uploads are fully decoded, SVG/HTML/animation is rejected, alt descriptions are required, and hashes cover unchanged original bytes. Links permit HTTP(S) without credentials and are never fetched for previews on the server. Text is rendered as escaped text with preserved line breaks, never interpreted as HTML.

Client-generated UUIDs make creation retries return the original post/reply/upload rather than duplicate it. Account locks, SQL ownership predicates, optimistic `version` checks and partial operations inside transactions prevent stale edits and attachment theft. Request throttles count failures before parsing/decoding; service limits also constrain successful writes. A conflicting alias or version preserves the visible draft and requests a reload.

Deletion removes the author's post body/link and attached originals; it does not delete another member's replies from their own export. Deleted work is omitted from the author's export. Moderator removal is reversible, records operator/reason, hides shared content and media, and leaves the author a reason notice and access to their own export. Reports are deduplicated by reporter/target. The review UI includes recent resolved reports so removals can be restored. It is not a general membership administration dashboard.

The Machine signal counts real, visible, undeleted posts marked as offerings since midnight UTC. No activity, replies, points, streaks or rewards are fabricated. The invitation is optional. Draft text stays in the open composer during failures; it is not persisted across a closed tab. Unattached uploads can be removed from Identity & export.

## Member-authorized API

All routes use the existing verified session cookie. There are no minted agent tokens or delegated scopes in Stage 1. Mutating requests require exact Origin matching `BETTER_AUTH_URL` and JSON except the bounded multipart image endpoint. Client-provided private account IDs are ignored; the server determines the actor from the session. All responses are no-store.

| Method and path under `/api/temple` | Behavior |
| --- | --- |
| `GET /identity` | Requester's chosen profile and owned-media metadata, even after paid access ends |
| `PUT /identity` | `{name,alias,persona,avatarId,version}`; version required on updates |
| `GET /profiles/:communityId` | Members-only chosen identity projection |
| `GET /feed[/:postId]?cursor=...` | Shared posts, chosen authors, media references, reaction counts and own reaction; 20 records per page |
| `POST /feed` | `{id,body,link,mediaIds,offering}`; `id` is a retry-stable UUID |
| `PATCH /feed/:id` | Same content plus current `version`; owner only |
| `DELETE /feed/:id` | Owner-only idempotent deletion; JSON `{}` |
| `GET /feed/:id/comments?cursor=...` | 30 replies per page; chosen attribution |
| `POST /feed/:id/comments` | `{id,body}`; retry-stable UUID |
| `PATCH /comments/:id` | Owner-only `{postId,body,version}` |
| `DELETE /comments/:id` | Owner-only deletion; JSON `{}` |
| `PUT /feed/:id/reaction` | `{kind:'spark'|'resonance'|'wonder'|null}`; one reaction per author/post; null clears |
| `POST /media` | Multipart `id`, `file`, `alt`; retry-stable UUID, bounded upload |
| `GET /media/:id` | Authenticated original binary; no redirect or public Blob URL |
| `DELETE /media/:id` | Requester's unattached, unused original; JSON `{}` |
| `POST /reports` | `{kind:'post'|'comment',targetId,reason}` |
| `GET /moderation` | Moderator-only recent report queue |
| `POST /moderation` | Moderator-only `{kind,targetId,action:'hide'|'restore'|'dismiss',reason}` |
| `GET /export` | Own-work ZIP; available after paid membership ends |
| `GET /export?format=json` | Same own-work manifest without binary bytes |

Errors return `{error}` with 400 validation, 401 session, 403 access/ownership, 404 unavailable, 409 conflict and 429 throttling. Cursor values are opaque; use returned cursors rather than constructing them. Identity creation and export need authentication; shared content requires membership. Agents can later consume these contracts through a separately authorized delegation layer, not by sharing admin credentials.

## Export schema version 1

The ZIP contains `manifest.json`, `my-work.md`, `README.txt` and `media/<stable-id>-<safe-original-name>`. `schema` is `blacktemple.own-work`; `schemaVersion` is `1`. Timestamps serialize as ISO 8601. The chosen profile identifies the author with their stable community UUID and current chosen attribution; no private auth identity or email is included.

`posts` contains only the requester's undeleted contributions: stable IDs, author IDs, original body/line breaks, link, optional-offering flag, version, creation/update times and any moderation state. `replies` contains only the requester's undeleted replies with opaque parent post IDs. These references do not copy another person's body, identity, replies or images. `media` contains only owned originals, including avatar/drafts, with their relation, filename, type, alt text, dimensions, timestamp, byte count, SHA-256 and archive path.

The snapshot is transactionally consistent. Downloaded originals preserve byte hashes. A standard ZIP reader can recover the JSON/body/metadata and media without a Temple service. There is no user-facing import flow in Stage 1; round-trip verification parses the ZIP independently and compares recovered IDs, metadata, bodies and hashes. No other member's reactions or replies are exported. No optional public AT adapter is enabled.

## Safe local review

Use an isolated loopback PostgreSQL database and synthetic-only environment. No Stripe/Google/provider keys are needed. `scripts/temple-local-fixtures.ts` rejects remote databases and live/provider runtime configuration, creates four verified synthetic accounts without sending mail, and seeds one labeled example offering. `TEMPLE_LOCAL_PREVIEW=true` adds an explicit synthetic-preview banner only with a loopback auth origin outside Vercel. Fixture emails are `temple-preview-{weaver,spark,moderator,expired}@example.test`; their password is the synthetic constant in that script. Never use those fixtures on a real deployment.

Run unit tests with `npm test`; integration checks with `TEMPLE_TEST_DATABASE_URL=<isolated-loopback-url> npm run test:temple:integration`; and browser checks against the labeled local server with `TEMPLE_LOCAL_PREVIEW=true TEMPLE_TEST_DATABASE_URL=<isolated-loopback-url> npm run test:temple:browser`. `TEMPLE_TEST_ORIGIN` defaults to `http://127.0.0.1:3003`. `PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an installed Chromium; otherwise Playwright uses its normal browser. Python 3 is used by integration/browser checks as an independent standard ZIP reader.

The existing accessibility suite can also run against this isolated server using `A11Y_BASE_URL`, the loopback membership environment, and a separate synthetic fixture account. It mutates that dedicated fixture through the existing local-only fixture script. Never point these checks at production or a database containing real member records.

## Owner review before any release

The patronage allocations are intentionally undecided. Review the offering copy, provisional tier mapping, technical media limits, retention/storage capacity, chosen moderator account and moderation policy. Configure and test the approved target schema before any preview deployment. No hosted preview, push or merge was made. The existing billing/booking infrastructure and its known Calendar risk need their own pre-launch integration verification. `bd` was not installed in this executor; no issue-tracker state was fabricated or changed.
