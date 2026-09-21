import type { Metadata } from 'next';
import { portfolio } from '@/content/portfolio';
import { getPortfolioArt } from '@/lib/portfolio';
import PortfolioNav from '@/components/portfolio/PortfolioNav';
import Atmosphere from '@/components/portfolio/Atmosphere';
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
  'I make games, paintings, stories, and experiments that stoke aliveness and curiosity. Come explore.';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: DESCRIPTION,
  openGraph: {
    title: 'Matthew D. Huff · mystery & dopeness',
    description: DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Matthew D. Huff · mystery & dopeness',
    description: DESCRIPTION,
    images: ['/portfolio/opengraph-image'],
  },
};

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
    <div className="portfolio-page relative isolate min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      {/* Without JavaScript the reveal wrappers never get their data attribute; show everything. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>

      <Atmosphere />
      <PortfolioNav name={hero.name} sections={sections} />

      <main className="relative z-10 space-y-24 pb-24 sm:space-y-32 sm:pb-32 lg:space-y-40">
        <Hero hero={hero} cabinet={cabinet} />
        <Games index="01" games={games} />
        <Fiction index="02" book={book} stories={stories} />
        <Paintings index="03" paintings={paintings} extras={extras} />
        <Mathematics />
      </main>

      <div className="relative z-10"><Contact name={hero.name} contact={contact} /></div>
    </div>
  );
}
