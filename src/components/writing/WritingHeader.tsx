import Link from 'next/link';

interface WritingHeaderProps {
  /** True on the /writing index, where "Writing" is the current page. */
  atIndex?: boolean;
}

// The writing pages render as plain documents over the 3D scene rather than
// inside a zone overlay, so they carry their own hairline header.
export default function WritingHeader({ atIndex = false }: WritingHeaderProps) {
  return (
    <header className="border-b border-white/10">
      <nav
        aria-label="Site"
        className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
      >
        <Link
          href="/"
          className="font-pixel text-[10px] leading-none text-zinc-400 transition-colors hover:text-white sm:text-xs"
        >
          Matthew D. Huff
        </Link>
        <Link
          href="/writing"
          aria-current={atIndex ? 'page' : undefined}
          className={`font-pixel text-[10px] leading-none transition-colors hover:text-white sm:text-xs ${
            atIndex ? 'text-white' : 'text-zinc-400'
          }`}
        >
          Writing
        </Link>
      </nav>
    </header>
  );
}
