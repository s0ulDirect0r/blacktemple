import { getAllPosts } from '@/lib/mdx';
import Link from 'next/link';
import { FiCalendar, FiTag } from 'react-icons/fi';

export default function WritingPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Writing</h1>
          <p className="text-xl text-zinc-400 mb-12">
            Thoughts on code, learning, and building things.
          </p>

          {posts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/writing/${post.slug}`}
                  className="block group"
                >
                  <article className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition-colors">
                    <h2 className="text-2xl font-bold mb-2 group-hover:text-zinc-300 transition-colors">
                      {post.title}
                    </h2>

                    <div className="flex items-center space-x-4 text-sm text-zinc-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <FiCalendar className="w-4 h-4" />
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </time>
                      </div>

                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <FiTag className="w-4 h-4" />
                          <span>{post.tags.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {post.excerpt && (
                      <p className="text-zinc-400 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
