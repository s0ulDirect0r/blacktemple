import type { Metadata } from 'next';
import { portfolio } from '@/content/portfolio';
import { getPortfolioArt } from '@/lib/portfolio';
import PortfolioNav from '@/components/portfolio/PortfolioNav';
import Hero from '@/components/portfolio/Hero';
import Paintings from '@/components/portfolio/Paintings';
import Mathematics from '@/components/portfolio/Mathematics';
import Fiction from '@/components/portfolio/Fiction';
import Games from '@/components/portfolio/Games';
import Contact from '@/components/portfolio/Contact';

// Regenerate at most once an hour: artwork comes from the database and image
// dimensions are measured on the server, so this keeps the page fast.
export const revalidate = 3600;

const DESCRIPTION =
  'Paintings, a novel, and two browser games by Matthew D. Huff, a digital painter, software engineer, and novelist in New York City.';

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getPortfolioArt();
  const title = `Portfolio · ${portfolio.hero.name}`;

  return {
    // The root layout's template appends the name, so the tab title is just 'Portfolio'.
    title: 'Portfolio',
    description: DESCRIPTION,
    openGraph: {
      title,
      description: DESCRIPTION,
      type: 'website',
      images: hero
        ? [{ url: hero.url, width: hero.width, height: hero.height, alt: hero.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: DESCRIPTION,
      images: hero ? [hero.url] : undefined,
    },
  };
}

export default async function PortfolioPage() {
  const { hero: heroArtwork, paintings: rest } = await getPortfolioArt();
  // The cabinet replaced the single hero painting, so it returns to the grid.
  const paintings = heroArtwork ? [heroArtwork, ...rest] : rest;
  const { hero, cabinet, book, stories, extras, games, contact } = portfolio;

  const sections = [
    { id: 'games', label: 'Games' },
    { id: 'fiction', label: 'Fiction' },
    { id: 'paintings', label: 'Paintings', short: 'Art' },
    { id: 'mathematics', label: 'Math' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      {/* Without JavaScript the reveal wrappers never get their data attribute; show everything. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>

      <PortfolioNav name={hero.name} sections={sections} />

      <main className="space-y-24 pb-24 sm:space-y-32 sm:pb-32 lg:space-y-40">
        <Hero hero={hero} cabinet={cabinet} />
        <Games index="01" games={games} />
        <Fiction index="02" book={book} stories={stories} />
        <Paintings index="03" paintings={paintings} extras={extras} />
        <Mathematics />
      </main>

      <Contact name={hero.name} contact={contact} />
    </div>
  );
}
