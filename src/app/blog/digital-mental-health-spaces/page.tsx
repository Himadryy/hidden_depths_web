import type { Metadata } from 'next';
import { ArticleSchema, BreadcrumbSchema } from '@/components/StructuredData';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Finding Mental Clarity Through Digital Spaces - Hidden Depths',
  description: 'How 3D visuals, ambient audio, and digital sanctuaries are revolutionizing mental health support and mindfulness.',
};

export default function BlogPost() {
  const article = {
    title: 'Finding Mental Clarity Through Digital Spaces',
    description: 'How 3D visuals, ambient audio, and digital sanctuaries are revolutionizing mental health support and mindfulness.',
    datePublished: '2026-01-25',
    dateModified: '2026-01-25',
    authorName: 'Himadryy',
    imageUrl: 'https://hidden-depths-web.pages.dev/og-image.png',
    url: 'https://hidden-depths-web.pages.dev/blog/digital-mental-health-spaces'
  };

  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Blog', url: 'https://hidden-depths-web.pages.dev/blog' },
    { name: 'Digital Mental Health Spaces', url: article.url },
  ];

  return (
    <>
      <ArticleSchema {...article} />
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-black text-white pt-24 pb-20">
        <article className="max-w-3xl mx-auto px-6">
          <header className="mb-12 text-center">
            <span className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-4 block">Technology & Mind</span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6 leading-tight">
              Finding Mental Clarity Through Digital Spaces
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>January 25, 2026</span>
                <span>•</span>
                <span>6 min read</span>
            </div>
          </header>

          <div className="prose prose-invert prose-lg max-w-none text-gray-300">
            <p className="lead text-xl text-white font-light italic mb-8">
              We usually blame screens for our stress. But what if a screen could be a sanctuary?
            </p>

            <p>
              The narrative around technology and mental health is usually negative: social media causes anxiety, blue light ruins sleep, doomscrolling destroys focus. While these are true, a new wave of <strong>Digital Therapeutics</strong> is flipping the script.
            </p>

            <p>
              By combining WebGL graphics, spatial audio, and psychology, developers are building "digital sanctuaries"—spaces designed not to capture your attention, but to restore it.
            </p>

            <hr className="border-white/10 my-10" />

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">The Science of Visual Calm</h2>
            <p>
              Why does staring at the ocean feel relaxing? It's a phenomenon called "Soft Fascination." Natural environments engage our attention without demanding effort, allowing our cognitive resources to replenish.
            </p>
            <p>
              At Hidden Depths, we use <strong>Voronoi fluid simulations</strong> (a type of mathematical noise) to mimic the movement of water. This isn't just aesthetic; it's functional. The slow, non-repeating patterns trigger a parasympathetic nervous system response—the "rest and digest" mode—similar to watching real waves or clouds.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">Audio Anchors</h2>
            <p>
              Sound is the fastest way to alter a mood. Our platform uses ambient soundscapes that sit in the 432Hz frequency range, often associated with relaxation. By blocking out the chaotic noise of your physical environment (traffic, construction, office chatter), the audio creates a "sonic bubble" where you can think clearly.
            </p>

            <h2 className="text-2xl font-serif text-white mt-10 mb-4">The "Third Space"</h2>
            <p>
              Sociologist Ray Oldenburg coined the term "Third Place" for spaces that aren't home (First Place) or work (Second Place)—like cafes or parks. In a remote-first world, we are losing these physical third places.
            </p>
            <p>
              Digital sanctuaries act as a virtual Third Place. They are neutral grounds. When you log into Hidden Depths, you aren't in your bedroom (where you sleep) or your home office (where you stress). You are in the Sanctuary. This psychological separation is crucial for effective mentorship and reflection.
            </p>

            <hr className="border-white/10 my-10" />

            <h2 className="text-2xl font-serif text-white mb-4">Design as Therapy</h2>
            <p>
               We believe that good UI/UX is a form of care. Dark modes reduce eye strain. Minimalist interfaces reduce cognitive load. Every pixel at Hidden Depths is designed to lower your cortisol, not spike your dopamine.
            </p>
            <p>
               Technology caused the noise. Now, let's use it to build the silence.
            </p>

          </div>

          <div className="mt-16 bg-white/5 p-8 rounded-2xl text-center border border-white/10">
            <h3 className="text-2xl font-serif text-white mb-4">Enter the Sanctuary</h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Experience the calming effect of our digital ocean for yourself.
            </p>
            <Link 
                href="/"
                className="inline-block bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-bold py-4 px-10 rounded-full transition-all uppercase tracking-widest text-sm"
            >
                Visit Home
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
