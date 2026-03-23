import type { Metadata } from 'next';
import Link from 'next/link';
import { OrganizationSchema, BreadcrumbSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Privacy Policy - Hidden Depths',
  description: 'Learn how Hidden Depths collects, uses, and protects your personal information. Your privacy and anonymity are our top priorities.',
  openGraph: {
    title: 'Privacy Policy - Hidden Depths',
    description: 'Our commitment to protecting your privacy and personal data',
    url: 'https://hidden-depths-web.pages.dev/privacy',
  },
};

export default function PrivacyPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Privacy Policy', url: 'https://hidden-depths-web.pages.dev/privacy' },
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
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Privacy Policy</h1>
            <p className="text-[var(--text-muted)]">Last updated: March 2026</p>
          </div>
        </section>

        {/* Content */}
        <article className="max-w-3xl mx-auto px-6 space-y-10">
          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">1. Information We Collect</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              At Hidden Depths, we are committed to protecting your privacy. We collect minimal information necessary to provide our services:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li><strong>Account Information:</strong> Email address for authentication and booking confirmations</li>
              <li><strong>Booking Details:</strong> Selected date, time, and preferred name (can be a pseudonym)</li>
              <li><strong>Payment Information:</strong> Processed securely through Razorpay; we do not store card details</li>
              <li><strong>Usage Data:</strong> Anonymous analytics to improve our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">2. How We Use Your Information</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              Your information is used solely to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li>Schedule and manage your mentorship sessions</li>
              <li>Send booking confirmations and reminders</li>
              <li>Process payments securely</li>
              <li>Improve our platform and services</li>
              <li>Respond to your inquiries</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">3. Anonymity & Confidentiality</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              We understand the sensitive nature of mental health support. That&apos;s why:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li>You may use a pseudonym during sessions</li>
              <li>Session content is never recorded or documented without explicit consent</li>
              <li>Our mentors are bound by strict confidentiality agreements</li>
              <li>Video calls are end-to-end encrypted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">4. Data Security</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              We implement industry-standard security measures including encryption, secure hosting on Cloudflare and Supabase, and regular security audits. Your data is stored securely and accessed only by authorized personnel when necessary.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">5. Third-Party Services</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              We use trusted third-party services:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li><strong>Supabase:</strong> Secure database and authentication</li>
              <li><strong>Razorpay:</strong> Payment processing (PCI-DSS compliant)</li>
              <li><strong>Cloudflare:</strong> Website hosting and security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">6. Your Rights</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">7. Contact Us</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:hiddendepthsss@gmail.com" className="text-[var(--accent)] hover:underline">
                hiddendepthsss@gmail.com
              </a>
            </p>
          </section>

          <section className="pt-8 border-t border-[var(--glass-border)]">
            <div className="flex flex-wrap gap-4">
              <Link href="/terms" className="text-[var(--accent)] hover:underline text-sm">
                Terms of Service →
              </Link>
              <Link href="/cookies" className="text-[var(--accent)] hover:underline text-sm">
                Cookie Policy →
              </Link>
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
