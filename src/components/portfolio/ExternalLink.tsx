import type { ReactNode } from 'react';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/** Underlined text link with a small outbound arrow. */
export default function ExternalLink({ href, children, className = '' }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group/link inline-flex items-baseline gap-1.5 text-white underline decoration-zinc-600 underline-offset-[6px] transition-colors hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${className}`}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="text-zinc-500 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-hover/link:text-white motion-reduce:transition-none"
      >
        ↗
      </span>
    </a>
  );
}
