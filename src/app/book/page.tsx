import { FiExternalLink } from 'react-icons/fi';

export default function BookPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Book cover */}
            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-sm">
                {/* Replace this placeholder with your actual book cover */}
                <div className="aspect-[2/3] bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center">
                  <p className="text-zinc-600 text-center px-4">
                    Book Cover<br />
                    <span className="text-sm">Add your cover image here</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Book details */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold mb-4">
                Your Book Title
              </h1>

              <p className="text-xl text-zinc-400 mb-6">
                A brief, compelling subtitle or tagline for your book.
              </p>

              <div className="prose prose-invert prose-zinc max-w-none mb-8">
                <p>
                  Replace this with your book description. Tell readers what your book is about,
                  what they&apos;ll learn, and why they should read it. Make it compelling and concise.
                </p>
                <p>
                  You can add multiple paragraphs here to provide more context about the book,
                  its themes, and what makes it special.
                </p>
              </div>

              {/* Purchase links */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-zinc-300 mb-3">Available At:</h3>

                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors group"
                >
                  <FiExternalLink className="w-5 h-5 text-amber-500" />
                  <div className="flex-1">
                    <div className="font-medium group-hover:text-zinc-300 transition-colors">
                      Amazon
                    </div>
                    <div className="text-sm text-zinc-500">Paperback & Kindle</div>
                  </div>
                </a>

                {/* Add more purchase links as needed */}
                {/*
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors group"
                >
                  <FiExternalLink className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium group-hover:text-zinc-300 transition-colors">
                      Barnes & Noble
                    </div>
                    <div className="text-sm text-zinc-500">Paperback</div>
                  </div>
                </a>
                */}
              </div>
            </div>
          </div>

          {/* Additional content section (optional) */}
          <div className="border-t border-zinc-800 pt-12">
            <h2 className="text-2xl font-bold mb-6">About This Book</h2>
            <div className="prose prose-invert prose-zinc max-w-none">
              <p>
                Add more detailed information about your book here. This could include:
              </p>
              <ul>
                <li>Key themes and topics covered</li>
                <li>Target audience</li>
                <li>What readers will gain from reading</li>
                <li>Background on why you wrote it</li>
              </ul>
              <p>
                You can also add reviews, excerpts, or any other content that would help
                readers learn more about your book.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
