# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads) for issue tracking. Use `bd` commands instead of markdown TODOs. See AGENTS.md for workflow details.

## Project Overview

Black Temple is a Next.js 16 portfolio/art gallery application featuring:
- Digital artwork gallery with project categorization
- MDX-based short fiction section (`/writing`)
- Project showcase
- Admin authentication for content management
- PostgreSQL database (Neon) for artwork/project metadata
- Vercel Blob for image storage

## Development Commands

```bash
# Development server (with Turbopack)
npm run dev

# Production build
npm run build
npm run start

# Linting
npm run lint

# Testing (Node.js native test runner)
npm test

# Database migrations
npm run migrate                # Run pending migrations
npm run verify-schema         # Verify database schema
npm run migrate-blobs         # Migrate blob storage
```

## Vercel CLI

The Vercel CLI is available for managing Vercel Blob storage:

```bash
# Upload file to Vercel Blob (requires sourcing .env for token)
source .env && vercel blob put <file-path> --rw-token "$BLOB_READ_WRITE_TOKEN"

# List blobs
source .env && vercel blob list --rw-token "$BLOB_READ_WRITE_TOKEN"

# Delete blob
source .env && vercel blob del <url-or-pathname> --rw-token "$BLOB_READ_WRITE_TOKEN"
```

Note: Must source `.env` before blob commands to access `BLOB_READ_WRITE_TOKEN`.

## Architecture

### Next.js App Router Structure

- **`src/app/`** - App Router pages and API routes
  - `page.tsx` - Home page (gallery)
  - `admin/` - Admin dashboard for content management
  - `artwork/[id]/` - Individual artwork detail pages
  - `projects/` - Project showcase page
  - `writing/` - Short fiction index and story pages
  - `api/` - REST API endpoints

### API Routes

- `/api/auth` - JWT-based admin authentication
- `/api/gallery` - Gallery image listing
- `/api/images` - CRUD operations for artwork
- `/api/projects` - Project management
- `/api/upload` - Image upload to Vercel Blob

### Core Libraries

- **`src/lib/db.ts`** - Neon PostgreSQL client wrapper
- **`src/lib/gallery.ts`** - Gallery data layer (images, projects, counts)
- **`src/lib/mdx.ts`** - MDX content parsing for posts/projects

### State Management

- **`src/context/GalleryContext.tsx`** - React Context for gallery state
  - Manages images, projects, project counts
  - Handles filtering, pagination, infinite scroll
  - Optimistic updates for uploads

### Content Management

- **MDX Files**: `content/stories/*.mdx` and `content/projects/*.mdx`
  - Parsed with `gray-matter` for frontmatter
  - Rendered with `next-mdx-remote`
  - Stories sorted by frontmatter `order`, projects by featured status
  - Story illustrations live in Vercel Blob under `stories/<slug>/`; upload with `npx tsx scripts/upload-story-images.ts`

- **Database-backed Images**: Stored in `artworks` table
  - URLs point to Vercel Blob storage
  - Metadata includes title, description, project association, tags
  - Projects stored in `projects` table

### Databases

Black Temple is Matthew's platform: a place members and ESCALATION players visit, follow the work and eventually pay to be part of. It serves people within his Temple; it is not a multi-creator platform. Two PostgreSQL databases live in one Neon project:

- **`temple`** — the platform. Accounts (Better Auth `member_*` tables), the free and paid memberships, the Temple community, ESCALATION (supporters, saves, feedback) and other people-centered features. Connection: `MEMBERSHIP_DATABASE_URL` (the `MEMBERSHIP_` prefix predates the rename). Migrations: `migrations/membership/*.sql`, applied with `npm run membership:migrate`. Code: `src/lib/membership/`, `src/lib/temple/`, `src/lib/escalation/`.
- **`neondb`** — the public site. `artworks`, `projects`, `migrations`, plus call bookings and the support payment ledger. Connection: `DATABASE_URL`. Migrations: numbered SQL files in `migrations/`.

New features about people go in `temple`. Call bookings and support payments are people data that may move to `temple` later. "Membership" in code and settings names is one feature of the platform (how people pay), not the platform itself.

## Key Components

- **`ArtGallery`** - Main gallery grid with infinite scroll
- **`ProjectFilter`** - Project selection/filtering UI
- **`ArtUploader`** - Admin image upload interface
- **`AdminAuth`** - JWT authentication wrapper
- **`Navigation`** - Site-wide navigation bar

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `ADMIN_SECRET` - Secret for admin authentication
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token

For paid call booking (`/calls`, code in `src/lib/calls/`):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe Checkout and `/api/payments/webhook`, the webhook for one-time payments (calls and support). ESCALATION (`/api/escalation/stripe-webhook`) and paid membership (`/api/membership/webhook`) have their own endpoints.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` - Google Calendar access; get the refresh token with `npx tsx scripts/google-calendar-auth.ts`
- `CALLS_AVAILABILITY_CALENDAR_ID` - calendar whose events are the bookable hours (the auth script creates an "Open for calls" calendar if unset)
- `CALLS_BUSY_CALENDAR_IDS` - optional, comma-separated calendars that block slots (default `primary`)

For membership (`/membership`, `/members`, code in `src/lib/membership/`, see `.env.membership.example`):
- Free accounts are the general membership. `MEMBERSHIP_PAID_VISIBLE=true` shows the paid tiers, checkout and paid member spaces; production leaves it unset.
- ESCALATION (escalation.blacktemple.dev) uses `/api/escalation/*` for sign-in status, supporter payments (Stripe webhook, `ESCALATION_STRIPE_WEBHOOK_SECRET`) and cloud saves.

### Sense (`/admin/sense`)

Matthew's private sensemaking space: channels of posts and threads (Discord-like) plus titled notes joined by `[[wiki links]]` with backlinks, `#tags`, search, pasted images and a markdown export that opens as an Obsidian vault. #signals receives new verified members, ESCALATION supporter payments and feedback automatically.

- API-first: `/api/sense/*` is the only interface (the admin page is one client). Every post and note records an author (`owner`, `agent`, `member`, `system`); `src/lib/sense/actor.ts` is where agent tokens and member sessions will authenticate later, so an MCP server or app can use the same API.
- Data: `sense_*` tables in the `temple` database. Links and tags are re-derived from bodies on every save (`src/lib/sense/text.ts` holds the shared rules).
- Images: private Vercel Blob store via `SENSE_BLOB_READ_WRITE_TOKEN` (separate from the public gallery store's `BLOB_READ_WRITE_TOKEN`); a local folder stands in outside production.

## Testing

Tests use Node.js native test runner (`node --test`):
- Located in `tests/*.test.ts`
- Run with `npm test` (via `tsx --test`)
- Use mocking for external dependencies (db, API calls)

## Path Aliases

TypeScript path alias configured:
- `@/*` maps to `src/*`

## Deployment

Deployed on Vercel:
- Automatic builds from main branch
- Environment variables managed in Vercel dashboard
- Uses Next.js 16 with Turbopack in development
