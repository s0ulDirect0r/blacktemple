/**
 * Content for the standalone /portfolio page.
 *
 * Everything the page renders that is not pulled from the database lives here,
 * so copy, links, and optional sections can be edited without touching the
 * components in src/components/portfolio/.
 */

import { bookExcerpt, type BookExcerpt } from './book';
import { formatDuration, tracks } from './music';

export interface PortfolioHero {
  name: string;
  role: string;
  /** One sentence under the name: what the work is about. */
  line: string;
  /** Artist statement, one string per paragraph. */
  statement: string[];
}

export interface CabinetImage {
  src: string;
  width: number;
  height: number;
}

/**
 * One tile in the hero "cabinet": one piece per medium, so a first-time visitor
 * sees the whole practice before scrolling. `video` is an optional muted loop
 * played on hover/focus over the poster.
 */
export interface CabinetTile {
  title: string;
  /** Medium and year, e.g. "sigil · 2025". */
  meta: string;
  href: string;
  image: CabinetImage | null;
  video?: string;
  /** Tile without an image: a small pixel waveform (music). */
  glyph?: 'waveform';
}

export interface PortfolioStory {
  title: string;
  /** Slug under /writing, e.g. "the-lantern" -> /writing/the-lantern */
  slug: string;
  excerpt: string;
}

export interface PortfolioLink {
  label: string;
  href: string;
  /** Small secondary text shown next to the label, e.g. "Kindle & paperback". */
  note?: string;
}

export interface PortfolioBook {
  title: string;
  cover: { src: string; width: number; height: number };
  /** Blurb, one string per paragraph. */
  blurb: string[];
  links: PortfolioLink[];
  /** Optional excerpt (label plus paragraphs). null hides the block. */
  excerpt: BookExcerpt | null;
}

export interface PortfolioGameImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface PortfolioVideo {
  src: string;
  poster: string;
  width: number;
  height: number;
  /** Shown under the player, e.g. the clip's own title. */
  caption?: string;
}

export interface PortfolioGame {
  title: string;
  /** One-line pitch shown large. */
  pitch: string;
  /** Short supporting paragraph. */
  description: string;
  tech: string[];
  images: PortfolioGameImage[];
  /** A playable clip; when present it is the lead media and images follow it. */
  video?: PortfolioVideo;
  links: { live?: string; repo: string };
}

export interface PortfolioTrack {
  title: string;
  /** Audio file URL (mp3/m4a/ogg). */
  src: string;
  /** Optional display duration, e.g. "3:42". */
  duration?: string;
}

export interface PortfolioContact {
  email: string;
  github: string;
  site: string;
}

export interface PortfolioContent {
  hero: PortfolioHero;
  /** Six tiles, one per medium, shown under the name. */
  cabinet: CabinetTile[];
  /**
   * Artwork ids (from the `artworks` table) to feature, in display order.
   * The first id becomes the hero image. An empty array means "take the
   * newest pieces from the database".
   */
  selectedArt: string[];
  /** Rendered only when non-empty. */
  stories: PortfolioStory[];
  /** One-line "Also:" links after the paintings, e.g. to the Spidernomicon. */
  extras?: { label: string; href: string }[];
  book: PortfolioBook;
  games: PortfolioGame[];
  /** Rendered only when non-empty. */
  music: PortfolioTrack[];
  contact: PortfolioContact;
}

const BLOB = 'https://zp7hauqhmxup1nll.public.blob.vercel-storage.com';

export const portfolio: PortfolioContent = {
  hero: {
    name: 'Matthew D. Huff',
    role: 'Digital painter · Software engineer · Novelist',
    line: 'Mystery and dopeness, in paint, prose, runes, songs and games. Made in the Black Temple, in public, since 2021.',
    // DRAFT — artist statement, first pass. Rewrite freely; keep it first person.
    statement: [
      'I paint on an iPad, most nights, after a day of writing software. The paintings are usually for someone: a friend, a stranger, a version of myself I am trying to reach. Many of them are blessings, titled in capitals and captioned with a prayer, and they come out of the same practice as my meditation. Sit with a feeling until it has a shape, then commit to it in color. Over the last few years that has added up to more than two hundred paintings, and I am still going.',
      'I have published a novel, An Infinite Heart, about a man whose nightmares and swells of feeling pull love and trouble into his life in equal measure. I built GODCELL, a multiplayer evolution game where you begin as a single cell and either transcend or lose everything, and a simulator that runs a star from nebula to black hole in your browser. Code, prose, and paint are one search to me, for the place where knowledge, creativity, and wisdom meet. I would like to give the paintings a year of undivided attention.',
    ],
  },
  cabinet: [
    {
      title: 'Dopeness',
      meta: 'sigil · 2025',
      href: '#paintings',
      image: { src: `${BLOB}/IMG_1536-uJyiI6Cs2OG3Zo3BXqzf24aizrDWId.jpeg`, width: 2560, height: 1664 },
    },
    {
      title: 'Escalation',
      meta: 'game · 2026, daily',
      href: '#games',
      image: { src: '/images/escalation-poster.jpg', width: 1440, height: 900 },
      video: '/images/escalation-loop.mp4',
    },
    {
      title: 'Spiderscript',
      meta: 'rune 1 of 100 · 2022',
      href: '/spidernomicon?rune=1',
      image: { src: `${BLOB}/spidernomicon/rune-001.jpg`, width: 800, height: 800 },
    },
    {
      title: 'An Infinite Heart',
      meta: 'novel · 2025',
      href: '#fiction',
      image: { src: `${BLOB}/Untitled_Artwork%2057.jpg`, width: 1275, height: 2061 },
    },
    {
      title: 'Synner',
      meta: 'short story · 2022',
      href: '/writing/synner',
      image: { src: `${BLOB}/stories/synner/cover.jpg`, width: 1200, height: 675 },
    },
    {
      title: 'Find the Way',
      meta: 'song · 2025',
      href: '#music',
      image: null,
      glyph: 'waveform',
    },
  ],

  selectedArt: [],

  stories: [
    {
      title: 'Poesis',
      slug: 'poesis',
      excerpt:
        'One hundred poems in one hundred tweets: a magic-wielding, poetic space pirate captain and his crew sail the SS Poesis to a planet called Akasha in search of the source of creative power.',
    },
    {
      title: 'Blood Drunk',
      slug: 'blood-drunk',
      excerpt:
        'Xeriax could feel it in his bones. He\u2019s going to die today. A wild toothy smile cuts a path across his face. His blood boils and churns and his muscles tighten and flex of their own accord.',
    },
    {
      title: 'Soulheist 777, Part 1',
      slug: 'soulheist-777-part-1',
      excerpt:
        'Somewhere in the Sol System, a man, a woman, and their ship have made a decision. A decision that will either doom their souls for all eternity or permanently engrave their names in the blockchain of history as legends who outsmarted the gods.',
    },
    {
      title: 'Synner',
      slug: 'synner',
      excerpt:
        'The man in the green suit sighs. This deal is going no where. The man in the blue suit shakes his head. He feels the same way.',
    },
  ],

  extras: [{ label: 'The Spidernomicon, a lexicon of 100 invented runes', href: '/spidernomicon' }],

  book: {
    title: 'An Infinite Heart',
    cover: { src: `${BLOB}/Untitled_Artwork%2057.jpg`, width: 1275, height: 2061 },
    blurb: [
      'A man by the name of Logos Mateus finds himself having nightmares and experiencing intense swells of emotion that disturb the people around him, his energy attracting both a lot of love and a lot of trouble into his life.',
      'Where will Logos’ journey to understand himself take him? How far up the mysterious World Tree, Big Drizzle, will he reach? How far deep into the mystery of the heart will he penetrate? Just how weird is it all going to get?',
    ],
    links: [
      { label: 'Amazon', href: 'https://a.co/d/fDa0kC9', note: 'Kindle & paperback' },
      { label: 'Gumroad', href: 'https://4106066624980.gumroad.com/l/aninfiniteheart', note: 'Digital download' },
    ],
    excerpt: bookExcerpt,
  },

  games: [
    {
      title: 'Escalation',
      pitch: 'A pixel-art war over an island. Start on foot, earn a machine, come back and prove it.',
      description:
        'A multiplayer island war in progress since 2025, built in plain JavaScript and canvas with an authoritative Node server. Three armies fight over five shrines through a day and night cycle; you begin vulnerable, take authored raids for bigger capabilities, and return to the shared war. Not public yet; the clip is from this week.',
      tech: ['JavaScript', 'Canvas', 'Node.js', 'Socket.io', 'Aseprite'],
      images: [],
      video: {
        src: `${BLOB}/escalation/have-i-gone-too-far.mp4`,
        poster: `${BLOB}/escalation/have-i-gone-too-far.jpg`,
        width: 1280,
        height: 800,
        caption: 'have i gone too far · gameplay, September 2026',
      },
      links: {
        repo: 'https://github.com/s0ulDirect0r/escalation',
      },
    },
    {
      title: 'Sun Simulator',
      pitch: 'A star, from nebula collapse to black hole, running live in the browser.',
      description:
        'Real-time 3D visualization of stellar evolution: 100,000+ particles coalesce under simplified gravity, burn through main sequence and red giant phases, detonate as a supernova, and collapse into a black hole with gravitational lensing written in custom GLSL shaders.',
      tech: ['Three.js', 'TypeScript', 'WebGL', 'GLSL', 'Vite'],
      images: [
        { src: '/images/sun-simulator-preview.png', width: 1400, height: 788, alt: 'Sun Simulator: a star mid-lifecycle surrounded by a particle nebula' },
      ],
      links: {
        live: 'https://sun-simulator.blacktemple.art/',
        repo: 'https://github.com/s0ulDirect0r/sun-simulator',
      },
    },
    {
      title: 'GODCELL',
      pitch: 'A real-time multiplayer evolution game. Begin as a fragile cyber-cell; transcend or die.',
      description:
        'An evolutionary survival game set in a hostile digital world. Scarcity forces competition, predation creates tension, and entropy swarms keep you moving. There are no tutorials; you learn by dying. Built on a custom entity-component-system shared between an authoritative server and a Three.js client.',
      tech: ['TypeScript', 'Three.js', 'Node.js', 'Socket.io', 'ECS'],
      images: [
        { src: `${BLOB}/godcell-gameplay.png`, width: 2356, height: 1588, alt: 'GODCELL gameplay: a cell drifting through a dark digital sea' },
        { src: `${BLOB}/godcell-image-1.png`, width: 1157, height: 796, alt: 'GODCELL: evolved form with glowing particle trails' },
        { src: `${BLOB}/godcell-image-2.png`, width: 1163, height: 793, alt: 'GODCELL: entropy swarm closing in' },
        { src: `${BLOB}/godcell-image-3.png`, width: 1154, height: 791, alt: 'GODCELL: a gravity well bending the field' },
      ],
      links: {
        repo: 'https://github.com/s0ulDirect0r/godcell',
      },
    },
  ],

  music: tracks.map((track) => ({
    title: track.title,
    src: track.src,
    duration: formatDuration(track.duration),
  })),

  contact: {
    email: 'matthewhuff89@gmail.com',
    github: 'https://github.com/s0ulDirect0r',
    site: 'https://blacktemple.dev',
  },
};
