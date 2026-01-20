'use client';

import Image from 'next/image';
import { FiExternalLink } from 'react-icons/fi';

export default function BookZoneContent() {
  return (
    <div className="max-w-4xl mx-auto text-white">
      <div className="grid md:grid-cols-2 gap-8">
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
    </div>
  );
}
