// Site-wide constants shared by metadata, OG images, sitemap and robots.

import type { Metadata } from 'next';

export const SITE_URL = 'https://blacktemple.dev';
export const SITE_NAME = 'Matthew D. Huff';
export const SITE_APPLICATION_NAME = 'Black Temple';
export const SITE_TITLE = 'MATTHEW D. HUFF';
export const SITE_TAGLINE = 'Artist · Engineer · Author';
export const SITE_DESCRIPTION =
  'Matthew D. Huff is an artist and software engineer in New York City. Digital art, fiction, and games — including the novel An Infinite Heart and the multiplayer evolution game GODCELL.';

export const BOOK_TITLE = 'An Infinite Heart';
export const BOOK_DESCRIPTION =
  'An Infinite Heart, a novel by Matthew D. Huff. Logos Mateus is haunted by nightmares and swells of emotion that pull love and trouble into his life; his search for himself leads up the World Tree. Available on Amazon and Gumroad.';
export const BOOK_COVER_URL =
  'https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/Untitled_Artwork%2057.jpg';

export const PAGE_META = {
  gallery: {
    title: 'Art',
    description:
      'Digital artwork by Matthew D. Huff — paintings, portraits and visions from the Black Temple gallery.',
  },
  projects: {
    title: 'Code',
    description:
      'Software projects by Matthew D. Huff, including GODCELL, a real-time multiplayer evolution game, and Sun Simulator, a 3D visualization of stellar evolution.',
  },
  writing: {
    title: 'Writing',
    description: 'Writing by Matthew D. Huff — thoughts on code, learning, and building things.',
  },
  resume: {
    title: 'Resume',
    description:
      'Resume of Matthew D. Huff, software engineer in New York City — experience, skills, and projects.',
  },
  about: {
    title: 'About',
    description:
      'About Matthew D. Huff — a software engineer and artist based in New York City, in search of the synthesis of knowledge, creativity, and wisdom.',
  },
} as const;

type OpenGraphExtra = NonNullable<Metadata['openGraph']>;

/**
 * Build the metadata for a page in one place so every route carries the same
 * Open Graph and Twitter basics. Next.js replaces (rather than deep-merges) the
 * nested `openGraph`/`twitter` objects from the root layout, so anything a page
 * sets must be complete.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle = `${title} · ${SITE_NAME}`,
  images,
  openGraph = {},
  robots,
}: {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  images?: Array<{ url: string; alt?: string }>;
  openGraph?: OpenGraphExtra;
  robots?: Metadata['robots'];
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      siteName: SITE_APPLICATION_NAME,
      locale: 'en_US',
      type: 'website',
      url: path,
      title: ogTitle,
      description,
      ...(images ? { images } : {}),
      ...openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      ...(images ? { images } : {}),
    },
    ...(robots ? { robots } : {}),
  };
}
