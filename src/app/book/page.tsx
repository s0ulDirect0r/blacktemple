import { FiExternalLink } from 'react-icons/fi';
import Image from 'next/image';

export default function BookPage() {
  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Book cover */}
            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-sm">
                <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl">
                  <Image
                    src="https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/Untitled_Artwork%2045.jpg"
                    alt="An Infinite Heart by Matthew D. Huff"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Book details */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold mb-2">
                An Infinite Heart
              </h1>

              <p className="text-lg text-zinc-400 mb-6">
                by Matthew D. Huff
              </p>

              <div className="prose prose-invert prose-zinc max-w-none mb-8">
                <p>
                  A man by the name of Logos Mateus finds himself having nightmares and experiencing
                  intense swells of emotion that disturb the people around him, his energy attracting
                  both a lot of love and a lot of trouble into his life.
                </p>
                <p>
                  Where will Logos&apos; journey to understand himself take him? How far up the mysterious
                  World Tree, Big Drizzle, will he reach? How far deep into the mystery of the heart will
                  he penetrate? Just how weird is it all going to get?
                </p>
                <p>
                  <em>An Infinite Heart</em> is a novel the author wrote in 2019 and 2020. Though he did
                  attempt to plan out the narrative, it took on a life of its own, and it became this deep
                  intense adventure in soulmaking for him, where he sat down every day and channelled this
                  story about Logos&apos; quest to open his heart and connect with the mysteries of the Universe.
                </p>
              </div>

              {/* Purchase links */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-zinc-300 mb-3">Available At:</h3>

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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
