import { getPostBySlug, getAllPosts } from '@/lib/mdx';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiCalendar, FiTag } from 'react-icons/fi';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

// Import highlight.js styles
import 'highlight.js/styles/github-dark.css';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <Link
            href="/writing"
            className="inline-flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors mb-8"
          >
            <FiArrowLeft />
            <span>Back to Writing</span>
          </Link>

          {/* Post header */}
          <article>
            <header className="mb-8">
              <h1 className="text-4xl font-bold mb-4">{post.metadata.title}</h1>

              <div className="flex items-center space-x-4 text-sm text-zinc-500">
                <div className="flex items-center space-x-1">
                  <FiCalendar className="w-4 h-4" />
                  <time dateTime={post.metadata.date}>
                    {new Date(post.metadata.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                {post.metadata.tags && post.metadata.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <FiTag className="w-4 h-4" />
                    <span>{post.metadata.tags.join(', ')}</span>
                  </div>
                )}
              </div>
            </header>

            {/* Post content */}
            <div className="prose prose-invert prose-zinc max-w-none
              prose-headings:font-bold
              prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:mb-4
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-white prose-strong:font-semibold
              prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-lg
              prose-ul:my-4 prose-ul:text-zinc-300
              prose-ol:my-4 prose-ol:text-zinc-300
              prose-li:my-2
              prose-blockquote:border-l-4 prose-blockquote:border-zinc-700 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400
            ">
              <MDXRemote
                source={post.content}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [rehypeHighlight],
                  },
                }}
              />
            </div>
          </article>

          {/* Back to writing link at bottom */}
          <div className="mt-12 pt-8 border-t border-zinc-800">
            <Link
              href="/writing"
              className="inline-flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
            >
              <FiArrowLeft />
              <span>Back to Writing</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
