# Black Temple

**[blacktemple.dev](https://blacktemple.dev)**

My portfolio — code, art, writing, résumé, and the book, in one place.

It isn't a page with a nav bar. The site is a single 3D scene: a starfield with a glowing machine at the center, and the sections orbit it as text you fly toward. Navigation moves a camera between zones rather than routing between documents.

---

## The zones

| Zone | What's there |
| --- | --- |
| **Code** | Project showcase, MDX-backed, filterable |
| **Art** | Digital artwork gallery with project categorization and infinite scroll |
| **Writing** | Short fiction: stories, a poem cycle, and two illustrated pieces, as MDX |
| **Résumé** | Current résumé |
| **Book** | *An Infinite Heart* |
| **About me** | Bio |

## How it's built

The home route renders `null` on purpose — there's nothing to draw. `LayoutContent` owns the persistent 3D scene, and a camera controller moves through it as the route changes, so the scene never unmounts between sections.

```
src/
  app/            # App Router pages + REST API routes
  components/
    three/        # SceneSetup, CameraController, StarField, TempleText,
                  # NavLinks, UnknownMachine — the 3D layer
    zones/        # Per-zone overlay content (About, Book, Gallery,
                  # Projects, Resume)
  context/        # GalleryContext — images, filtering, pagination,
                  # infinite scroll, optimistic upload updates
  lib/
    db.ts         # Neon Postgres client
    gallery.ts    # Gallery data layer
    mdx.ts        # MDX parsing for stories + projects
```

**Content comes from two places.** Stories and projects are MDX files in `content/stories/` and `content/projects/`, parsed with `gray-matter` and rendered via `next-mdx-remote`. Story illustrations are uploaded to Vercel Blob with `scripts/upload-story-images.ts`. Artwork is database-backed — rows in `artworks` and `projects` on Neon Postgres, with the images themselves in Vercel Blob.

**Admin is JWT-gated.** `/admin` sits behind a `jose`-verified token and handles uploads and metadata editing without a CMS.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Three.js · React Three Fiber + drei + postprocessing · Neon serverless Postgres · Vercel Blob · Cloudinary · next-mdx-remote · jose

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Requires a `.env` with:

```bash
DATABASE_URL=            # Neon Postgres connection string
ADMIN_SECRET=            # signing secret for admin auth
BLOB_READ_WRITE_TOKEN=   # Vercel Blob token
```

## Database

```bash
npm run migrate          # run pending migrations
npm run verify-schema    # check schema state
npm run migrate-blobs    # migrate blob storage
```

Migrations are numbered SQL files in `migrations/`, tracked in a `migrations` table.

## Testing

Node's native test runner via `tsx`:

```bash
npm test
```

## Deployment

Vercel, auto-building from `main`. Live at [blacktemple.dev](https://blacktemple.dev).
