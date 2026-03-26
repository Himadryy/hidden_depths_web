import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { ArticleSchema, BreadcrumbSchema } from '@/components/StructuredData';
import { getPostBySlug, getAllPostSlugs } from '@/lib/blog';
import { MDXComponents } from '@/components/mdx/MDXComponents';
import { Calendar, Clock, User, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found - Hidden Depths',
    };
  }

  return {
    title: `${post.title} - Hidden Depths`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://hidden-depths-web.pages.dev/blog/${slug}`,
    },
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const article = {
    title: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    authorName: post.author,
    imageUrl: 'https://hidden-depths-web.pages.dev/og-image.png',
    url: `https://hidden-depths-web.pages.dev/blog/${slug}`,
  };

  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Blog', url: 'https://hidden-depths-web.pages.dev/blog' },
    { name: post.title, url: article.url },
  ];

  return (
    <>
      <ArticleSchema {...article} />
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-black text-white pt-24 pb-20">
        <article className="max-w-3xl mx-auto px-6">
          {/* Back Link */}
          <Link 
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-[var(--accent)] transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-12 text-center">
            <span className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-4 block">
              {post.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span>{formatDate(post.date)}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>{post.readingTime}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <User size={14} />
                <span>{post.author}</span>
              </div>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                {post.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="text-xs px-3 py-1 bg-white/5 rounded-full text-gray-400 border border-white/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <MDXRemote 
              source={post.content} 
              components={MDXComponents}
            />
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-white/5 p-8 rounded-2xl text-center border border-white/10">
            <h3 className="text-2xl font-serif text-white mb-4">Need a Space to Think?</h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Our anonymous mentors are here to listen. No judgment, no labels. Just clarity.
            </p>
            <Link 
              href="/booking"
              className="inline-block bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-bold py-4 px-10 rounded-full transition-all uppercase tracking-widest text-sm"
            >
              Book a Session (₹99)
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
