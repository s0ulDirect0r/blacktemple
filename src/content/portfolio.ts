/**
 * Content for the standalone /portfolio page.
 *
 * Everything the page renders that is not pulled from the database lives here,
 * so copy, links, and optional sections can be edited without touching the
 * components in src/components/portfolio/.
 */

import type { BookExcerpt } from './book';
import { sunderedExcerpt } from './sundered';
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
  /** 'contain' shows the whole image (a book cover, a poster) instead of filling the tile. */
  fit?: 'cover' | 'contain';
  video?: string;
  /** Opens a larger gameplay player when this tile is clicked. */
  expandedVideo?: PortfolioVideo;
  /** Play the video on its own, muted and looping, like a GIF (still shown under reduced motion). */
  autoplay?: boolean;
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
  /** Describes non-gameplay clips in the player and its accessible label. */
  label?: string;
  loop?: boolean;
  /** Short muted hover preview; the full recording opens on click. */
  previewSrc?: string;
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
  /** Featured work shown under the name. */
  cabinet: CabinetTile[];
  /**
   * Artwork ids (from the `artworks` table) to feature, in display order.
   * The first id becomes the hero image. An empty array means "take the
   * newest pieces from the database".
   */
  selectedArt: string[];
  /** Uploaded works curated specifically for this portfolio. */
  additionalArt: { id: string; title: string; url: string; width: number; height: number; video?: PortfolioVideo }[];
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

const godcellVideo: PortfolioVideo = {
  src: '/images/godcell-gameplay.mp4',
  previewSrc: '/images/godcell-hover.mp4',
  poster: '/images/godcell-poster.jpg',
  width: 1440,
  height: 960,
  caption: 'GODCELL · gameplay',
};

export const portfolio: PortfolioContent = {
  hero: {
    name: 'Matthew D. Huff',
    role: 'Digital painter · Software engineer · Novelist',
    line: 'I walk the path of mystery & dopeness by creating digital and physical artifacts that stoke aliveness and curiosity.',
    statement: [
      "I walk the path of mystery & dopeness by creating digital and physical artifacts that stoke aliveness and curiosity.",
      "A big challenge of my thirties has been learning to be really fucking honest about what I want, what I like, and what I want to make. An energy, an essence flows through me and demands expression, demands to be honored. Making things is how I become a conduit for that expression.",
      "I feel it, and I observe my behavior. What am I actually doing? What creates that surge of productive, creative energy in my body? My work happens in phases: paintings, stories, a novel, games. With Escalation, I catch myself spending whole days building, playing, tuning, and making music videos out of game clips. There’s a quality of flow that happens when I’m doing what I really want to do. That flow is a nutrient. I need it.",
      "Honoring that isn’t easy. Economic pressure, personal pressure, and shame push against it. Writing An Infinite Heart, I had to confront my shadow over and over to honor what wanted to go into the story. I do the best I can.",
      "What’s true for me? What’s true about the world? Those questions are part of my mathematics journey, too. I felt defeated by proofs as a kid and carried a lot of envy for people with strong math backgrounds. I decided to do something about it. Then I fell in love with mathematics.",
      "Art has often felt like surrender. Mathematics has been commitment. I made a promise to myself to reach a certain point, and I’m getting closer. Sometimes I fall off or need a break. I ask myself: am I done, or do I need a break? Usually, I need a break. When I look inside, I still want to do it.",
      "I’m learning to be honest about what wants expression, and what it takes to keep honoring it. Sometimes that means surrendering to the energy. Sometimes it means resting and coming back to a commitment I still care about. I keep asking what’s true, and I keep making things from what I find. That’s how I walk the path of mystery & dopeness.",
    ],
  },
  cabinet: [
    {
      title: 'Heart',
      meta: 'sigil · 2026',
      href: '#paintings',
      image: { src: `${BLOB}/art/heart/heart.jpg`, width: 2560, height: 1664 },
      // The Procreate timelapse of the piece, muted, plays on hover.
      video: `${BLOB}/art/heart/heart-timelapse.mp4`,
    },
    {
      title: 'Escalation',
      meta: 'game · 2026',
      href: '#games',
      image: { src: `${BLOB}/escalation/title.png`, width: 980, height: 600 },
      video: '/images/escalation-loop.mp4',
    },
    {
      title: 'Sun Simulator',
      meta: 'simulation · 2025',
      href: '#games',
      image: { src: '/images/sun-simulator-lifecycle-poster.jpg', width: 640, height: 400 },
      video: '/images/sun-simulator-lifecycle.mp4',
    },
    {
      title: 'GODCELL',
      meta: 'game · 2026',
      href: '#games',
      image: { src: godcellVideo.poster, width: 960, height: 640 },
      expandedVideo: godcellVideo,
    },
    {
      title: 'Hypercalculator',
      meta: 'application · 2026',
      href: '#mathematics',
      image: { src: '/images/portfolio/math/hypercalculator-demo.jpg', width: 1224, height: 822 },
      expandedVideo: {
        src: '/images/portfolio/math/hypercalculator-demo.mp4',
        previewSrc: '/images/portfolio/math/hypercalculator-hover.mp4',
        poster: '/images/portfolio/math/hypercalculator-demo.jpg',
        width: 1224,
        height: 822,
        label: 'graphing demo',
        loop: true,
      },
    },
    {
      title: 'An Infinite Heart',
      meta: 'novel · 2025',
      href: '#fiction',
      image: { src: `${BLOB}/Untitled_Artwork%2057.jpg`, width: 1275, height: 2061 },
      fit: 'contain',
    },
  ],

  selectedArt: ['19', '18', '16', '13', '12', '11', '10', '9', '8', '7', '5'],
  additionalArt: [
    {
      id: 'i-miss-you', title: 'i miss you', url: '/images/portfolio/paintings/i-miss-you.jpg', width: 1600, height: 1600,
      video: { src: '/images/portfolio/paintings/i-miss-you.mp4?loop=2', previewSrc: '/images/portfolio/paintings/i-miss-you-hover.mp4?loop=2', poster: '/images/portfolio/paintings/i-miss-you.jpg', width: 1600, height: 1600, label: 'animation', loop: true },
    },
    {
      id: 'connection', title: 'connection', url: '/images/portfolio/paintings/connection.jpg', width: 1600, height: 1600,
      video: { src: '/images/portfolio/paintings/connection.mp4?loop=2', previewSrc: '/images/portfolio/paintings/connection-hover.mp4?loop=2', poster: '/images/portfolio/paintings/connection.jpg', width: 1600, height: 1600, label: 'animation', loop: true },
    },
    {"id": "unknown-99987", "title": "unknown_99987", "url": "/images/portfolio/paintings/unknown-99987.jpg", "width": 1600, "height": 1600, "video": {"src": "/images/portfolio/paintings/unknown-99987.mp4?loop=2", "previewSrc": "/images/portfolio/paintings/unknown-99987-hover.mp4?loop=2", "poster": "/images/portfolio/paintings/unknown-99987.jpg", "width": 1600, "height": 1600, "label": "animation", "loop": true}},
    {"id": "the-enchantress", "title": "THE ENCHANTRESS", "url": "/images/portfolio/paintings/the-enchantress.jpg", "width": 1600, "height": 900, "video": {"src": "/images/portfolio/paintings/the-enchantress.mp4?loop=2", "previewSrc": "/images/portfolio/paintings/the-enchantress-hover.mp4?loop=2", "poster": "/images/portfolio/paintings/the-enchantress.jpg", "width": 1600, "height": 900, "label": "animation", "loop": true}},
    {"id": "the-erotic", "title": "THE EROTIC", "url": "/images/portfolio/paintings/the-erotic.jpg", "width": 1600, "height": 900, "video": {"src": "/images/portfolio/paintings/the-erotic.mp4?loop=2", "previewSrc": "/images/portfolio/paintings/the-erotic-hover.mp4?loop=2", "poster": "/images/portfolio/paintings/the-erotic.jpg", "width": 1600, "height": 900, "label": "animation", "loop": true}},
    {"id": "hope", "title": "hope", "url": "/images/portfolio/paintings/hope.jpg", "width": 1600, "height": 1600, "video": {"src": "/images/portfolio/paintings/hope.mp4?loop=2", "previewSrc": "/images/portfolio/paintings/hope-hover.mp4?loop=2", "poster": "/images/portfolio/paintings/hope.jpg", "width": 1600, "height": 1600, "label": "animation", "loop": true}},
    {"id": "golden-soul", "title": "golden soul", "url": "/images/portfolio/paintings/golden-soul.jpg", "width": 1600, "height": 1600, "video": {"src": "/images/portfolio/paintings/golden-soul.mp4?loop=2", "previewSrc": "/images/portfolio/paintings/golden-soul-hover.mp4?loop=2", "poster": "/images/portfolio/paintings/golden-soul.jpg", "width": 1600, "height": 1600, "label": "animation", "loop": true}},
    {"id": "sphere", "title": "sphere", "url": "/images/portfolio/paintings/sphere.jpg", "width": 4000, "height": 4000},
    {"id": "highfrequency", "title": "highfrequency", "url": "/images/portfolio/paintings/highfrequency.jpg", "width": 4000, "height": 4000},
    { id: 'the-vow-sigil', title: 'THE VOW SIGIL', url: '/images/portfolio/paintings/the-vow-sigil.jpg', width: 4000, height: 4000 },
    { id: 'untitled-1', title: 'dopeness in darkness', url: '/images/portfolio/paintings/untitled-1.jpg', width: 3000, height: 3000 },
    { id: 'loopys-flow', title: 'LOOPY’S FLOW', url: '/images/portfolio/paintings/loopys-flow.jpg', width: 3840, height: 2160 },
    { id: 'untitled-7', title: 'untitled', url: '/images/portfolio/paintings/untitled-7.jpg', width: 3000, height: 3000 },
    { id: 'christins-unfolding', title: 'CHRISTIN’S UNFOLDING', url: '/images/portfolio/paintings/christins-unfolding.jpg', width: 3840, height: 2160 },
    { id: 'untitled-3', title: 'untitled', url: '/images/portfolio/paintings/untitled-3.jpg', width: 4000, height: 4000 },
  ],

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
      title: "Spider's Path",
      slug: 'spiders-path',
      excerpt:
        'one glorious day / deep in the jungle / in a cozy silk bed / a spider hatches / different from its brothers and sisters / tinted a strange black and red',
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
      'It’s a story of learning to love—himself, other people, even what he hates or finds disgusting in both—and unleashing the magic within him to touch others.',
      'Where will that journey take him? How far up the mysterious World Tree, Big Drizzle, will he reach? How far deep into the mystery of the heart will he penetrate? Just how weird is it all going to get?',
    ],
    links: [
      { label: 'Amazon', href: 'https://a.co/d/fDa0kC9', note: 'Kindle & paperback' },
      { label: 'Gumroad', href: 'https://4106066624980.gumroad.com/l/aninfiniteheart', note: 'Digital download' },
    ],
    excerpt: sunderedExcerpt,
  },

  games: [
    {
      title: 'Escalation',
      pitch: 'A top-down pixel-art arcade war playground. I’m making the game I really want to play.',
      description:
        'Escalation started with an MMO conceit, but playing it, I noticed I wasn’t having fun. I didn’t always want to travel around or deal with quests. Sometimes I just wanted to jump in and fight to my heart’s content. So I made Holdout: survive increasingly ridiculous waves of troopers, mechs, and frames until the battlefield is littered with blood, ash, and wrecked machines. Holdout has become where I find the fun—and where I notice what needs to change. Constantly fighting means constantly testing the weapons, watching how the enemies move, noticing a sprite that feels off or a balance problem. Then I sit down and change it. There’s still plenty of tuning to do, but I’m really enjoying playing what I’m making.',
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
      video: {
        src: '/images/sun-simulator-lifecycle.mp4',
        previewSrc: '/images/sun-simulator-lifecycle.mp4',
        poster: '/images/sun-simulator-lifecycle-poster.jpg',
        width: 640,
        height: 400,
        caption: 'Nebula → star → red giant → supernova → black hole',
      },
      description:
        'Real-time 3D visualization of stellar evolution: 100,000+ particles coalesce under simplified gravity, burn through main sequence and red giant phases, detonate as a supernova, and collapse into a black hole with gravitational lensing written in custom GLSL shaders.',
      tech: ['Three.js', 'TypeScript', 'WebGL', 'GLSL', 'Vite'],
      images: [
        { src: '/images/sun-simulator-preview.png', width: 1400, height: 788, alt: 'Sun Simulator: a star mid-lifecycle surrounded by a particle nebula' },
      ],
      links: {
        live: 'https://sun-simulator.blacktemple.dev/',
        repo: 'https://github.com/s0ulDirect0r/sun-simulator',
      },
    },
    {
      title: 'GODCELL',
      pitch: 'A real-time multiplayer evolution game. Begin as a fragile cyber-cell; transcend or die.',
      video: godcellVideo,
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
