/**
 * Content for the standalone /portfolio page.
 *
 * Everything the page renders that is not pulled from the database lives here,
 * so copy, links, and optional sections can be edited without touching the
 * components in src/components/portfolio/.
 */

export interface PortfolioHero {
  name: string;
  role: string;
  location: string;
  /** Artist statement, one string per paragraph. */
  statement: string[];
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
  /** Optional excerpt. Paragraph breaks are blank lines. null hides the block. */
  excerpt: string | null;
}

export interface PortfolioGameImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface PortfolioGame {
  title: string;
  /** One-line pitch shown large. */
  pitch: string;
  /** Short supporting paragraph. */
  description: string;
  tech: string[];
  images: PortfolioGameImage[];
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
  /**
   * Artwork ids (from the `artworks` table) to feature, in display order.
   * The first id becomes the hero image. An empty array means "take the
   * newest pieces from the database".
   */
  selectedArt: string[];
  /** Rendered only when non-empty. */
  stories: PortfolioStory[];
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
    location: 'New York City',
    // DRAFT — artist statement, first pass. Rewrite freely; keep it first person.
    statement: [
      'I paint on an iPad, most nights, after a day of writing software. The paintings are usually for someone: a friend, a stranger, a version of myself I am trying to reach. Many of them are blessings, titled in capitals and captioned with a prayer, and they come out of the same practice as my meditation. Sit with a feeling until it has a shape, then commit to it in color. Over the last few years that has added up to more than two hundred paintings, and I am still going.',
      'I have published a novel, An Infinite Heart, about a man whose nightmares and swells of feeling pull love and trouble into his life in equal measure. I built GODCELL, a multiplayer evolution game where you begin as a single cell and either transcend or lose everything, and a simulator that runs a star from nebula to black hole in your browser. Code, prose, and paint are one search to me, for the place where knowledge, creativity, and wisdom meet. I would like to give the paintings a year of undivided attention.',
    ],
  },

  selectedArt: [],

  stories: [],

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
    excerpt: null,
  },

  games: [
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

  music: [],

  contact: {
    email: 'matthewhuff89@gmail.com',
    github: 'https://github.com/s0ulDirect0r',
    site: 'https://blacktemple.dev',
  },
};
