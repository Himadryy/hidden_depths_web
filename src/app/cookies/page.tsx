import type { Metadata } from 'next';
import Link from 'next/link';
import { OrganizationSchema, BreadcrumbSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Cookie Policy - Hidden Depths',
  description: 'Learn about how Hidden Depths uses cookies and similar technologies to enhance your browsing experience.',
  openGraph: {
    title: 'Cookie Policy - Hidden Depths',
    description: 'Understanding our use of cookies and tracking technologies',
    url: 'https://hidden-depths-web.pages.dev/cookies',
  },
};

export default function CookiesPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Cookie Policy', url: 'https://hidden-depths-web.pages.dev/cookies' },
  ];

  return (
    <>
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-24 pb-12">
        {/* Header */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-6 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Cookie Policy</h1>
            <p className="text-[var(--text-muted)]">Last updated: March 2026</p>
          </div>
        </section>

        {/* Content */}
        <article className="max-w-3xl mx-auto px-6 space-y-10">
          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">What Are Cookies?</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, keep you logged in, and understand how you use the site. Hidden Depths uses cookies to provide a better, more personalized experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              <div className="bg-[var(--glass-panel)] p-5 rounded-xl border border-[var(--glass-border)]">
                <h3 className="text-lg font-serif text-[var(--foreground)] mb-2">Essential Cookies</h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  Required for the website to function. These include authentication tokens (via Supabase) that keep you logged in and session identifiers for bookings. Cannot be disabled.
                </p>
              </div>

              <div className="bg-[var(--glass-panel)] p-5 rounded-xl border border-[var(--glass-border)]">
                <h3 className="text-lg font-serif text-[var(--foreground)] mb-2">Preference Cookies</h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  Remember your settings like theme preference (light/dark mode) and language selection. These enhance your experience but are not strictly necessary.
                </p>
              </div>

              <div className="bg-[var(--glass-panel)] p-5 rounded-xl border border-[var(--glass-border)]">
                <h3 className="text-lg font-serif text-[var(--foreground)] mb-2">Analytics Cookies</h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  Help us understand how visitors use our website. We use privacy-focused analytics that do not track personal information. Data is anonymized and aggregated.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Third-Party Cookies</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              Some cookies may be set by third-party services we use:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li><strong>Supabase:</strong> Authentication and session management</li>
              <li><strong>Razorpay:</strong> Payment processing (only during checkout)</li>
              <li><strong>Cloudflare:</strong> Security and performance optimization</li>
            </ul>
            <p className="text-[var(--text-muted)] leading-relaxed mt-4">
              We do not use advertising cookies or sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Managing Cookies</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>
            <p className="text-[var(--text-muted)] leading-relaxed mt-4">
              Note: Disabling essential cookies may prevent you from using certain features like logging in or making bookings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Local Storage</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              In addition to cookies, we use browser local storage to save your theme preference. This data stays on your device and is never transmitted to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Updates to This Policy</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              We may update this Cookie Policy as our practices change. Check this page periodically for the latest information about our cookie practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">Contact Us</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              If you have questions about our cookie practices, contact us at{' '}
              <a href="mailto:hiddendepthsss@gmail.com" className="text-[var(--accent)] hover:underline">
                hiddendepthsss@gmail.com
              </a>
            </p>
          </section>

          <section className="pt-8 border-t border-[var(--glass-border)]">
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy" className="text-[var(--accent)] hover:underline text-sm">
                Privacy Policy →
              </Link>
              <Link href="/terms" className="text-[var(--accent)] hover:underline text-sm">
                Terms of Service →
              </Link>
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
