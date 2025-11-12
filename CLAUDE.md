# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads) for issue tracking. Use `bd` commands instead of markdown TODOs. See AGENTS.md for workflow details.

## Project Overview

Black Temple is a Next.js 16 portfolio/art gallery application featuring:
- Digital artwork gallery with project categorization
- MDX-based blog/writing section
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
  - `writing/` - Blog/writing section
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

- **MDX Files**: `content/posts/*.mdx` and `content/projects/*.mdx`
  - Parsed with `gray-matter` for frontmatter
  - Rendered with `next-mdx-remote`
  - Posts sorted by date, projects by featured status

- **Database-backed Images**: Stored in `artworks` table
  - URLs point to Vercel Blob storage
  - Metadata includes title, description, project association, tags
  - Projects stored in `projects` table

### Database Schema

- **`artworks`** - Artwork images with metadata
- **`projects`** - Project categories for organizing artwork
- **`migrations`** - Migration tracking table

Migrations are numbered SQL files in `migrations/` directory.

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
