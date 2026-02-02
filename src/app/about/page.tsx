import type { Metadata } from 'next';
import Link from 'next/link';
import { OrganizationSchema, BreadcrumbSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'About Us - Anonymous Mental Health Support Platform',
  description: 'Learn about Hidden Depths, a unique digital sanctuary offering anonymous mental health support and affordable 1-on-1 mentorship sessions based in Kolkata, India.',
  openGraph: {
    title: 'About Hidden Depths - Our Mission',
    description: 'Creating a safe, anonymous space for mental clarity and emotional support',
    url: 'https://hidden-depths-web.pages.dev/about',
  },
};

export default function AboutPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'About', url: 'https://hidden-depths-web.pages.dev/about' },
  ];

  return (
    <>
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      
      <main className="min-h-screen bg-black text-white pt-24 pb-12">
        {/* Hero Section */}
        <section className="relative py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              About Hidden Depths
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-8 font-light italic">
              When your head is full, and you need a space to think.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <article className="max-w-3xl mx-auto px-6 space-y-16">
          
            <section>
              <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Our Mission</h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                Hidden Depths was born from a simple yet powerful truth: sometimes, you need a safe space to think without judgment, without labels, without the weight of identity. Mental health support shouldn&apos;t be a luxury reserved for the privileged few.
              </p>
              <p className="text-gray-300 leading-relaxed text-lg mt-4">
                We combine cutting-edge 3D visuals, calming ambient audio, and anonymous 1-on-1 mentorship to create a unique digital sanctuary where mental clarity becomes accessible to everyone.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Why Anonymous?</h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                Anonymity removes the fear of judgment. It allows you to be completely honest about your struggles, your fears, your doubts—without worrying about how others perceive you. This is where real healing begins.
              </p>
              <p className="text-gray-300 leading-relaxed text-lg mt-4">
                In traditional therapy, the clinical environment and formal documentation can feel intimidating. Hidden Depths strips away these barriers. You can use a pseudonym, share only what you&apos;re comfortable with, and still receive genuine support.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-[var(--accent)] mb-6">What Makes Us Different</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
                  <h3 className="text-lg font-serif mb-2 text-[var(--accent)]">Affordable Pricing</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    At just ₹99 per 45-minute session, we&apos;re significantly more accessible than traditional therapy options.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
                  <h3 className="text-lg font-serif mb-2 text-[var(--accent)]">No Commitments</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Pay per session, no subscriptions. Book when you need us, cancel anytime with 24 hours notice.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
                  <h3 className="text-lg font-serif mb-2 text-[var(--accent)]">Immersive Experience</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Custom-built 3D ocean visuals create a calming environment unlike any other platform.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[var(--accent)]/50 transition-colors">
                  <h3 className="text-lg font-serif mb-2 text-[var(--accent)]">Complete Privacy</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    End-to-end encrypted video calls, no recordings, no session notes shared without permission.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Based in Kolkata, Serving All of India</h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                While we&apos;re rooted in Kolkata, West Bengal, our digital sanctuary is accessible to anyone with an internet connection. Mental health knows no borders, and neither should support.
              </p>
            </section>

            <section className="text-center pt-8">
              <h2 className="text-3xl font-serif mb-6 text-white">Ready to Take the First Step?</h2>
              <Link
                href="/booking" // Using client-side navigation since Link is standard in Next.js
                className="inline-block bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-bold py-4 px-10 rounded-full text-sm tracking-widest uppercase transition-all shadow-lg shadow-[var(--accent)]/20"
              >
                Book Your Session
              </Link>
            </section>

        </article>
      </main>
    </>
  );
}
