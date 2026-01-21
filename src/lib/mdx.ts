import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/posts');
const projectsDirectory = path.join(process.cwd(), 'content/projects');

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

export interface Post {
  metadata: PostMetadata;
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
