'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiExternalLink } from 'react-icons/fi';
import { bookExcerpt } from '@/content/book';

export default function BookZoneContent() {
  const [prologueOpen, setPrologueOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto text-white">
      <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
        {/* Book cover */}
        <div className="flex justify-center md:justify-end">
          <div className="w-full max-w-sm">
            <div className="relative rounded overflow-hidden shadow-2xl border-2 border-gray-900">
              <Image
                src="https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/Untitled_Artwork%2057.jpg"
                alt="An Infinite Heart by Matthew D. Huff"
                width={600}
                height={900}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>

        {/* Book details */}
        <div className="flex flex-col justify-between max-w-lg">
          <h1 className="font-pixel text-base sm:text-lg md:text-xl">An Infinite Heart</h1>

          <p className="text-lg text-zinc-400 mt-2">by Matthew D. Huff</p>

          <div className="prose prose-invert prose-zinc max-w-none my-8 space-y-6 text-base leading-relaxed">
            <p>
              A man by the name of Logos Mateus finds himself having nightmares and
              experiencing intense swells of emotion that disturb the people around
              him, his energy attracting both a lot of love and a lot of trouble into
              his life.
            </p>
            <p>
              Where will Logos&apos; journey to understand himself take him? How far
              up the mysterious World Tree, Big Drizzle, will he reach? How far deep
              into the mystery of the heart will he penetrate? Just how weird is it
              all going to get?
            </p>
          </div>

          {/* Purchase links */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-300 mb-3">
              Available At:
            </h3>

            <a
              href="https://a.co/d/fDa0kC9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors group"
            >
              <FiExternalLink className="w-5 h-5 text-amber-500" />
              <div className="flex-1">
                <div className="font-medium group-hover:text-zinc-300 transition-colors">
                  Amazon
                </div>
                <div className="text-sm text-zinc-500">Kindle & Paperback</div>
              </div>
            </a>

            <a
              href="https://4106066624980.gumroad.com/l/aninfiniteheart"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors group"
            >
              <FiExternalLink className="w-5 h-5 text-pink-500" />
              <div className="flex-1">
                <div className="font-medium group-hover:text-zinc-300 transition-colors">
                  Gumroad
                </div>
                <div className="text-sm text-zinc-500">Digital Download</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Read the prologue: collapsed by default, expands inline below the purchase links */}
      <section
        aria-labelledby="book-prologue-toggle"
        className="mt-10 border-t border-white/10 pt-8 sm:mt-12"
      >
        <button
          id="book-prologue-toggle"
          type="button"
          onClick={() => setPrologueOpen((open) => !open)}
          aria-expanded={prologueOpen}
          aria-controls="book-prologue"
          className="group inline-flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-sm"
        >
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center border border-white/20 font-mono text-sm leading-none transition-colors group-hover:border-white"
          >
            {prologueOpen ? '−' : '+'}
          </span>
          {prologueOpen ? 'Hide the prologue' : 'Read the prologue'}
        </button>

        <div id="book-prologue" hidden={!prologueOpen} className="mt-8 max-w-[65ch]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">{bookExcerpt.title}</p>
          <div className="mt-5 space-y-5 text-[17px] leading-[1.7] text-zinc-200">
            {bookExcerpt.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
