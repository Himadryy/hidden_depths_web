import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/StructuredData';
import { ArrowRight, Calendar } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Mental Health Blog - Hidden Depths',
  description: 'Articles about mental wellness, stress management, finding clarity, and the benefits of anonymous support.',
  openGraph: {
    title: 'Hidden Depths Blog - Mental Wellness Insights',
    description: 'Explore our latest articles on mental health and clarity.',
    url: 'https://hidden-depths-web.pages.dev/blog',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogListingPage() {
  const posts = getAllPosts();
  
  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Blog', url: 'https://hidden-depths-web.pages.dev/blog' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-black text-white pt-24 pb-20">
        <section className="relative px-4 sm:px-6 lg:px-8 mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              The Sanctuary Journal
            </h1>
            <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto">
              Insights, reflections, and guidance on navigating the complexities of the modern mind.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link 
                key={post.slug} 
                href={`/blog/${post.slug}`}
                className="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-[var(--accent)]/50 transition-all hover:-translate-y-1"
            >
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between text-xs text-[var(--accent)] mb-4 uppercase tracking-wider font-bold">
                    <span>{post.category}</span>
                    <span className="text-gray-500 font-normal normal-case">{post.readingTime}</span>
                </div>
                
                <h2 className="text-xl font-serif font-bold mb-3 group-hover:text-[var(--accent)] transition-colors leading-tight">
                    {post.title}
                </h2>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
                    {post.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        {formatDate(post.date)}
                    </div>
                    <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-[var(--accent)]">
                        Read Article <ArrowRight size={12} />
                    </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
