import Image from 'next/image';
import type { StoryImage } from '@/lib/mdx';

interface StorySequenceProps {
  title: string;
  images: StoryImage[];
}

// An illustrated piece: the images are the story, read top to bottom, each
// at its native ratio with the author's caption beneath.
export default function StorySequence({ title, images }: StorySequenceProps) {
  return (
    <ol className="space-y-12 sm:space-y-16">
      {images.map((image, i) => (
        <li key={image.src}>
          <figure>
            <Image
              src={image.src}
              alt={image.caption ? `${title}: ${image.caption}` : `${title}, page ${i + 1}`}
              width={image.width}
              height={image.height}
              sizes="(max-width: 767px) 100vw, 768px"
              priority={i === 0}
              className="mx-auto h-auto w-full max-w-full"
              style={{ maxWidth: image.width }}
            />
            {image.caption && (
              <figcaption className="mx-auto mt-4 max-w-[65ch] text-center font-serif text-lg leading-relaxed text-zinc-300">
                {image.caption}
              </figcaption>
            )}
          </figure>
        </li>
      ))}
    </ol>
  );
}
