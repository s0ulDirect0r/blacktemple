import type { StoryMetadata } from '@/lib/mdx';

const KIND_LABEL: Record<StoryMetadata['kind'], string> = {
  story: 'Short story',
  poem: 'Poem',
  illustrated: 'Illustrated story',
};

// Frontmatter dates are plain YYYY-MM-DD strings; format them as UTC so the
// day never shifts with the server's time zone.
export function formatStoryDate(date: string, month: 'long' | 'short' = 'long') {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric',
    month,
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Word count for text pieces; the kind label already says "illustrated".
export function storyLength(story: Pick<StoryMetadata, 'kind' | 'words'>) {
  if (story.kind === 'illustrated' || !story.words) return null;
  return `${story.words.toLocaleString('en-US')} words`;
}

interface StoryMetaProps {
  story: Pick<StoryMetadata, 'kind' | 'date' | 'words'>;
  className?: string;
}

// Small uppercase line: "Short story · April 16, 2022 · 825 words"
export default function StoryMeta({ story, className = '' }: StoryMetaProps) {
  const parts = [KIND_LABEL[story.kind], formatStoryDate(story.date), storyLength(story)].filter(
    Boolean,
  );

  return (
    <p className={`text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs ${className}`}>
      {parts.map((part, i) => (
        <span key={part as string}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {i === 1 ? <time dateTime={story.date}>{part}</time> : part}
        </span>
      ))}
    </p>
  );
}
