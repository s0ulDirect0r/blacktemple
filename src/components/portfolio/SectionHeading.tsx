interface SectionHeadingProps {
  /** id for the h2, so the parent section can point aria-labelledby at it. */
  id: string;
  index: string;
  title: string;
  /** Small right-aligned note, e.g. "16 of 200+" */
  meta?: string;
}

export default function SectionHeading({ id, index, title, meta }: SectionHeadingProps) {
  return (
    // items-end rather than items-baseline: the pixel font's baseline sits low, so
    // aligning line-box bottoms with leading-none keeps index, title and meta level.
    <div className="flex items-end gap-4 border-b border-white/10 pb-5 sm:gap-6 sm:pb-7">
      <span className="font-pixel text-[10px] leading-none text-zinc-500 sm:text-xs" aria-hidden="true">
        {index}
      </span>
      <h2 id={id} className="font-pixel text-base leading-none text-white sm:text-xl lg:text-2xl">{title}</h2>
      {meta && (
        <span className="ml-auto text-xs leading-none tracking-wide text-zinc-500 sm:text-sm">{meta}</span>
      )}
    </div>
  );
}
