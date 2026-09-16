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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">
      <nav
        aria-label="Portfolio sections"
        className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-14 sm:px-6"
      >
        <a
          href="#top"
          className="font-pixel text-[9px] text-white transition-colors hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[11px]"
        >
          <span className="sm:hidden" aria-label={name}>
            {initials}
          </span>
          <span className="hidden sm:inline">{name}</span>
        </a>
        <ul className="flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-zinc-400 sm:gap-8 sm:text-xs">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
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
