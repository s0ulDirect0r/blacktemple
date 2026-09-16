interface PortfolioNavProps {
  name: string;
  sections: { id: string; label: string }[];
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
        className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-14 sm:px-6"
      >
        <a
          href="/"
          title="Enter the full site"
          className="font-pixel text-[10px] text-white transition-all duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[12px] md:text-[14px]"
        >
          <span className="sm:hidden" aria-label={name}>
            {initials}
          </span>
          <span className="hidden sm:inline">{name}</span>
        </a>
        <ul className="flex items-center gap-4 font-pixel text-[9px] uppercase text-zinc-400 sm:gap-7 sm:text-[11px] md:gap-9 md:text-[13px]">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-block transition-all duration-200 hover:scale-110 hover:text-white focus-visible:text-white focus-visible:outline-none"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
