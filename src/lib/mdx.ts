import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/posts');
const projectsDirectory = path.join(process.cwd(), 'content/projects');
const storiesDirectory = path.join(process.cwd(), 'content/stories');

export interface PostMetadata {
  title: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  slug: string;
}

export interface ProjectMetadata {
  title: string;
  description: string;
  techStack: string[];
  repoUrl?: string;
  demoUrl?: string;
  imageUrl?: string;
  images?: string[];
  featured?: boolean;
  slug: string;
}

export type StoryKind = 'story' | 'poem' | 'illustrated';

export interface StoryImage {
  src: string;
  width: number;
  height: number;
  caption?: string;
}

export interface StoryMetadata {
  slug: string;
  title: string;
  /** ISO date (YYYY-MM-DD) the piece was first published. */
  date: string;
  kind: StoryKind;
  /** The author's own subtitle, e.g. "a cyberpunk short story". */
  tagline?: string;
  /** First ~30 words, plain text. */
  excerpt: string;
  cover: string;
  coverWidth: number;
  coverHeight: number;
  /** Word count of the text; absent for illustrated pieces. */
  words?: number;
  source: 'twitter' | 'pages';
  /** The original thread, for pieces first posted on Twitter/X. */
  originalUrl?: string;
  /** Position in the index (ascending). */
  order: number;
  /** Closing lines ("with Love, Genius, and ..."), newline separated. */
  signoff?: string;
  /** Illustrated pieces: the images, in reading order, with optional captions. */
  sequence?: StoryImage[];
}

export interface Post {
  metadata: PostMetadata;
  content: string;
}

export interface Story {
  metadata: StoryMetadata;
  content: string;
}

export interface Project {
  metadata: ProjectMetadata;
  content: string;
}

// Helper to ensure directory exists
function ensureDirectoryExists(directory: string) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory);
}

// Get all posts sorted by date (newest first)
export function getAllPosts(): PostMetadata[] {
  const fileNames = ensureDirectoryExists(postsDirectory);
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title,
        date: data.date,
        excerpt: data.excerpt,
        tags: data.tags || [],
      } as PostMetadata;
    });

  // Sort by date, newest first
  return posts.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

// Get a single post by slug
export function getPostBySlug(slug: string): Post | null {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    metadata: {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt,
      tags: data.tags || [],
    },
    content,
  };
}

// Get all projects
export function getAllProjects(): ProjectMetadata[] {
  const fileNames = ensureDirectoryExists(projectsDirectory);
  const projects = fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(projectsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title,
        description: data.description,
        techStack: data.techStack || [],
        repoUrl: data.repoUrl,
        demoUrl: data.demoUrl,
        imageUrl: data.imageUrl,
        images: data.images || [],
        featured: data.featured || false,
      } as ProjectMetadata;
    });

  // Sort featured projects first
  return projects.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });
}

// Get a single project by slug
export function getProjectBySlug(slug: string): Project | null {
  const fullPath = path.join(projectsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    metadata: {
      slug,
      title: data.title,
      description: data.description,
      techStack: data.techStack || [],
      repoUrl: data.repoUrl,
      demoUrl: data.demoUrl,
      imageUrl: data.imageUrl,
      images: data.images || [],
      featured: data.featured || false,
    },
    content,
  };
}

function toStoryMetadata(slug: string, data: Record<string, unknown>): StoryMetadata {
  return {
    slug,
    title: String(data.title),
    date: String(data.date),
    kind: (data.kind as StoryKind) || 'story',
    tagline: data.tagline ? String(data.tagline) : undefined,
    excerpt: String(data.excerpt ?? ''),
    cover: String(data.cover),
    coverWidth: Number(data.coverWidth),
    coverHeight: Number(data.coverHeight),
    words: typeof data.words === 'number' ? data.words : undefined,
    source: data.source === 'pages' ? 'pages' : 'twitter',
    originalUrl: data.originalUrl ? String(data.originalUrl) : undefined,
    order: typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
    signoff: data.signoff ? String(data.signoff) : undefined,
    sequence: Array.isArray(data.sequence) ? (data.sequence as StoryImage[]) : undefined,
  };
}

// Get all stories in index order (frontmatter `order`, then newest first)
export function getStories(): StoryMetadata[] {
  const fileNames = ensureDirectoryExists(storiesDirectory);
  const stories = fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(storiesDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      return toStoryMetadata(slug, data);
    });

  return stories.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

// Get a single story by slug
export function getStory(slug: string): Story | null {
  const fullPath = path.join(storiesDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    metadata: toStoryMetadata(slug, data),
    content,
  };
}
