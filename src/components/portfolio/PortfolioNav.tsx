import Link from 'next/link';

interface PortfolioNavProps {
  name: string;
  /** `short` is used below the phone breakpoint so the bar never wraps or scrolls. */
  sections: { id: string; label: string; short?: string }[];
}

export default function PortfolioNav({ name, sections }: PortfolioNavProps) {
  // Phone widths get a monogram so the bar never wraps: "Matthew D. Huff" -> "MDH".
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    // Sticky, not fixed: the site bar sits above this in flow, and this pins to
    // the top once the page scrolls past it.
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/85 backdrop-blur-md">
      <nav
        aria-label="Portfolio sections"
        className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4 sm:h-14 sm:px-6"
      >
        <Link
          href="/"
          title="Enter the full site"
          className="shrink-0 font-pixel text-[10px] text-white transition-all duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[12px] md:text-[14px]"
        >
          <span className="sm:hidden" aria-label={name}>
            {initials}
          </span>
          <span className="hidden sm:inline">{name}</span>
        </Link>
        <ul className="flex min-w-0 items-center gap-2.5 whitespace-nowrap font-pixel text-[8px] uppercase text-zinc-400 sm:gap-4 sm:text-[10px] md:gap-5 md:text-[11px] lg:gap-9 lg:text-[13px]">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-block transition-all duration-200 hover:scale-110 hover:text-white focus-visible:text-white focus-visible:outline-none"
              >
                <span className="sm:hidden">{section.short ?? section.label}</span>
                <span className="hidden sm:inline">{section.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
