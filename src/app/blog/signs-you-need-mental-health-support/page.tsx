import type { Metadata } from 'next';
import { ArticleSchema, BreadcrumbSchema } from '@/components/StructuredData';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '5 Signs You Need to Talk to Someone About Your Mental Health - Hidden Depths',
  description: 'Recognizing when you need help is the first step toward healing. Learn the 5 key signs that indicate it’s time to reach out for anonymous support.',
};

export default function BlogPost() {
  const article = {
    title: '5 Signs You Need to Talk to Someone About Your Mental Health',
    description: 'Recognizing when you need help is the first step toward healing. Learn the 5 key signs that indicate it’s time to reach out for anonymous support.',
    datePublished: '2026-02-01',
    dateModified: '2026-02-01',
    authorName: 'Himadryy',
    imageUrl: 'https://hidden-depths-web.pages.dev/og-image.png',
    url: 'https://hidden-depths-web.pages.dev/blog/signs-you-need-mental-health-support'
  };

  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Blog', url: 'https://hidden-depths-web.pages.dev/blog' },
    { name: '5 Signs You Need Support', url: article.url },
  ];

  return (
    <>
      <ArticleSchema {...article} />
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-black text-white pt-24 pb-20">
        <article className="max-w-3xl mx-auto px-6">
          <header className="mb-12 text-center">
            <span className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-4 block">Mental Wellness</span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6 leading-tight">
              5 Signs You Need to Talk to Someone About Your Mental Health
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>February 1, 2026</span>
                <span>•</span>
                <span>5 min read</span>
            </div>
          </header>

          <div className="prose prose-invert prose-lg max-w-none text-gray-300">
            <p className="lead text-xl text-white font-light italic mb-8">
              We often tell ourselves "I'm fine" or "It's just a bad week." But sometimes, that bad week turns into a bad month, and the weight becomes too heavy to carry alone.
            </p>

            <p>
              Recognizing when you need support isn't a sign of weakness; it's a profound act of self-awareness. At Hidden Depths, we believe that clarity comes from conversation. Here are five signs that it might be time to seek an anonymous mentor or counselor.
            </p>

            <hr className="border-white/10 my-10" />

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">1. Your Sleep Patterns Have Changed Drastically</h2>
            <p>
              Sleep is often the first casualty of mental stress. Are you lying awake for hours, your mind racing with worries you can't shut off? Or perhaps you're sleeping 10+ hours a day and still waking up exhausted? Significant disruptions in your sleep cycle are your brain's way of waving a red flag.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">2. You Feel Numb or Disconnected</h2>
            <p>
              Sadness is a natural emotion. But feeling <em>nothing</em>—a persistent sense of numbness or emptiness—is different. If you find yourself disconnected from the things that used to bring you joy, or if you feel like you're watching your life from the outside (dissociation), talking to someone can help you reconnect with yourself.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">3. Small Things Trigger Big Reactions</h2>
            <p>
              Did dropping a coffee mug make you burst into tears? Did a minor email from a coworker send you into a rage spiral? When our emotional "bucket" is full, even a single drop can cause it to overflow. Disproportionate emotional reactions suggest that you're carrying a heavy load of unprocessed stress.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">4. You're Isolating Yourself</h2>
            <p>
              Solitude can be healing, but isolation is different. If you're actively avoiding friends, ignoring calls, or cancelling plans because the effort of social interaction feels overwhelming, you might be withdrawing to protect yourself. Ironically, connection is often the antidote you need.
            </p>
            <div className="bg-[var(--accent)]/10 p-6 border-l-4 border-[var(--accent)] my-8">
                <p className="italic text-white">
                    "This is where anonymous platforms like Hidden Depths shine. You can break the isolation without the pressure of 'performing' for friends or family."
                </p>
            </div>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">5. You Can't "Switch Off"</h2>
            <p>
              Do you feel like your brain has 50 tabs open and they're all frozen? Persistent anxiety, the inability to relax, or physical symptoms like clenched jaws and tight shoulders are signs that your nervous system is stuck in "fight or flight" mode. You need a space to exhale.
            </p>

            <hr className="border-white/10 my-10" />

            <h2 className="text-2xl font-serif text-white mb-4">Taking the First Step</h2>
            <p>
              If any of these resonate with you, know that you don't have to navigate it alone. You don't need a diagnosis to deserve support. You just need to be a human being having a hard time.
            </p>
            <p>
              Booking a session doesn't mean something is "wrong" with you. It means you're prioritizing your clarity and peace. And with anonymous options available, you can do it on your own terms.
            </p>

          </div>

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
