import Link from 'next/link';
import type { PortfolioContact } from '@/content/portfolio';
import Reveal from './Reveal';
import ExternalLink from './ExternalLink';

interface ContactProps {
  name: string;
  contact: PortfolioContact;
}

export default function Contact({ name, contact }: ContactProps) {
  const siteLabel = contact.site.replace(/^https?:\/\//, '');
  const githubLabel = contact.github.replace(/^https?:\/\/(www\.)?/, '');

  return (
    <footer id="contact" className="scroll-mt-14 border-t border-white/10 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">Contact</p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-6 inline-block break-all text-2xl font-medium tracking-tight text-white transition-colors hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-4xl lg:text-5xl"
          >
            {contact.email}
          </a>

          <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-base sm:text-lg">
            <li>
              <ExternalLink href={contact.github}>{githubLabel}</ExternalLink>
            </li>
            <li>
              <ExternalLink href={contact.site}>{siteLabel}</ExternalLink>
            </li>
          </ul>
        </Reveal>

        <div className="mt-20 flex flex-col gap-6 border-t border-white/10 pt-8 sm:mt-28 sm:flex-row sm:items-end sm:justify-between">
          <Link
            href="/"
            className="font-pixel group inline-flex items-center gap-3 text-[10px] text-white transition-colors hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-xs"
          >
            Enter the site
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
              →
            </span>
          </Link>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} {name}
          </p>
        </div>
      </div>
    </footer>
  );
}
