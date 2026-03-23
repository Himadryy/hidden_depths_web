import type { Metadata } from 'next';
import Link from 'next/link';
import { OrganizationSchema, BreadcrumbSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Terms of Service - Hidden Depths',
  description: 'Read the terms and conditions for using Hidden Depths mental health support and mentorship services.',
  openGraph: {
    title: 'Terms of Service - Hidden Depths',
    description: 'Terms and conditions for our mental health support services',
    url: 'https://hidden-depths-web.pages.dev/terms',
  },
};

export default function TermsPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'Terms of Service', url: 'https://hidden-depths-web.pages.dev/terms' },
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
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Terms of Service</h1>
            <p className="text-[var(--text-muted)]">Last updated: March 2026</p>
          </div>
        </section>

        {/* Content */}
        <article className="max-w-3xl mx-auto px-6 space-y-10">
          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">1. Acceptance of Terms</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              By accessing or using Hidden Depths (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">2. Nature of Services</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              Hidden Depths provides mentorship and emotional support services. Please note:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li>Our services are <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment</li>
              <li>We provide peer support and mentorship, not licensed therapy</li>
              <li>In case of emergency, please contact local emergency services or a crisis helpline</li>
              <li>We may refer you to professional services if we believe it is in your best interest</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">3. Booking & Payments</h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li>Sessions are priced at ₹99 for 45 minutes</li>
              <li>Payment is required at the time of booking</li>
              <li>All payments are processed securely through Razorpay</li>
              <li>Cancellations made 24+ hours before the session are eligible for a full refund</li>
              <li>No-shows or late cancellations are non-refundable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">4. User Responsibilities</h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              As a user of Hidden Depths, you agree to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 ml-4">
              <li>Provide accurate contact information</li>
              <li>Attend scheduled sessions on time</li>
              <li>Treat our mentors with respect and courtesy</li>
              <li>Not record sessions without explicit consent</li>
              <li>Not share account credentials with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">5. Confidentiality</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              We take confidentiality seriously. All session content remains private between you and your mentor, except in cases where there is a legal obligation to report (such as imminent harm to self or others) or with your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">6. Intellectual Property</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              All content on Hidden Depths, including text, graphics, logos, and software, is the property of Hidden Depths and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">7. Limitation of Liability</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Hidden Depths provides services &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability is limited to the amount paid for the specific service in question.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">8. Termination</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              We reserve the right to terminate or suspend your access to our services at our discretion, particularly in cases of violation of these terms, abusive behavior toward staff, or any illegal activity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">9. Changes to Terms</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify users of significant changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">10. Governing Law</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              These terms are governed by the laws of India. Any disputes shall be resolved in the courts of Kolkata, West Bengal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-[var(--accent)] mb-4">11. Contact</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              For questions about these terms, contact us at{' '}
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
