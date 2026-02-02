import type { Metadata } from 'next';
import { ArticleSchema, BreadcrumbSchema } from '@/components/StructuredData';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Power of Anonymous Therapy - Hidden Depths',
  description: 'Why anonymity matters in mental health support. Discover how hiding your identity can help you be more honest and accelerate healing.',
};

export default function BlogPost() {
  const article = {
    title: 'The Power of Anonymous Therapy: Why Removing Identity Matters',
    description: 'Why anonymity matters in mental health support. Discover how hiding your identity can help you be more honest and accelerate healing.',
    datePublished: '2026-01-28',
    dateModified: '2026-01-28',
    authorName: 'Himadryy',
    imageUrl: 'https://hidden-depths-web.pages.dev/og-image.png',
    url: 'https://hidden-depths-web.pages.dev/blog/anonymous-therapy-benefits'
  };

  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Blog', url: 'https://hidden-depths-web.pages.dev/blog' },
    { name: 'Power of Anonymous Therapy', url: article.url },
  ];

  return (
    <>
      <ArticleSchema {...article} />
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-black text-white pt-24 pb-20">
        <article className="max-w-3xl mx-auto px-6">
          <header className="mb-12 text-center">
            <span className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-4 block">Therapy & Support</span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6 leading-tight">
              The Power of Anonymous Therapy: Why Removing Identity Matters
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>January 28, 2026</span>
                <span>•</span>
                <span>7 min read</span>
            </div>
          </header>

          <div className="prose prose-invert prose-lg max-w-none text-gray-300">
            <p className="lead text-xl text-white font-light italic mb-8">
              "Give a man a mask, and he will tell you the truth." — Oscar Wilde
            </p>

            <p>
              Vulnerability is terrifying. In a world where our personal brands are curated on Instagram and LinkedIn, admitting to struggle feels like a failure. We worry: <em>What if my boss finds out? What will my family think? Will this go on my permanent record?</em>
            </p>

            <p>
              These fears create a massive barrier to seeking help. This is where <strong>anonymous therapy</strong> (or mentorship) changes the game. By removing the weight of identity, we unlock a faster, deeper path to clarity.
            </p>

            <hr className="border-white/10 my-10" />

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">1. The "Stranger on a Train" Effect</h2>
            <p>
              Psychologists have long observed that people often reveal their deepest secrets to complete strangers they'll never see again. Why? Because there are no consequences.
            </p>
            <p>
              When you talk to someone who doesn't know your name, your job, or your family, you don't have to maintain your "persona." You can stop being the "reliable employee" or the "strong parent" and just be the person who is hurting. This radical honesty accelerates healing because you get straight to the root of the problem.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">2. Breaking the Stigma Barrier</h2>
            <p>
              In many cultures, especially in India, mental health struggles are still stigmatized. The fear of being labeled "mentally ill" prevents millions from seeking help.
            </p>
            <p>
              Anonymity sidesteps this entirely. You aren't a patient with a file; you're just a voice in a sanctuary. Platforms like Hidden Depths allow you to seek support without ever creating a paper trail that you fear might follow you.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">3. Focus on the Issue, Not the Context</h2>
            <p>
              In traditional therapy, you might spend the first three sessions just explaining your background. In anonymous mentorship, you can dive straight into the specific feeling or conflict you're facing <em>right now</em>.
            </p>
            <p>
               It makes the sessions tactical and focused. You clarify the chaos in your head without needing to provide a full biography first.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">4. Safety Control</h2>
            <p>
               For survivors of trauma or individuals in controlling relationships, anonymity is a safety feature. It puts the control firmly back in your hands. You decide how much to share. You decide when to disconnect. This sense of agency is empowering and therapeutic in itself.
            </p>

            <hr className="border-white/10 my-10" />

            <h2 className="text-2xl font-serif text-white mb-4">Experience the Freedom</h2>
            <p>
               At Hidden Depths, we built our entire platform around this principle. We ask for no phone numbers, no addresses, no real names. Just an email to send you the link.
            </p>
            <p>
               We believe that when you take off the mask you wear for the world, you can finally breathe.
            </p>

          </div>

          <div className="mt-16 bg-white/5 p-8 rounded-2xl text-center border border-white/10">
            <h3 className="text-2xl font-serif text-white mb-4">Ready to Speak Freely?</h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Your identity stays with you. Your burden stays with us.
            </p>
            <Link 
                href="/booking"
                className="inline-block bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-bold py-4 px-10 rounded-full transition-all uppercase tracking-widest text-sm"
            >
                Book Anonymously (₹99)
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
