import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQSchema, BreadcrumbSchema } from '@/components/StructuredData';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions - Hidden Depths',
  description: 'Answers to common questions about anonymous mental health support, pricing, booking sessions, and privacy at Hidden Depths.',
  openGraph: {
    title: 'FAQ - Hidden Depths Mental Health Support',
    description: 'Everything you need to know about our anonymous mentorship sessions.',
    url: 'https://hidden-depths-web.pages.dev/faq',
  },
};

const faqs = [
  {
    category: 'General',
    items: [
      {
        q: 'What is Hidden Depths?',
        a: 'Hidden Depths is an anonymous mental health support platform offering affordable 1-on-1 mentorship sessions. We combine professional guidance with an immersive 3D digital sanctuary to help you find mental clarity and emotional relief.'
      },
      {
        q: 'How is this different from clinical therapy?',
        a: 'Hidden Depths focuses on "mentorship for mental clarity" rather than clinical treatment for severe disorders. Think of it as a safe space to untangle your thoughts, manage stress, and get unbiased perspective on life challenges. For severe clinical conditions, we recommend seeing a licensed psychiatrist.'
      },
      {
        q: 'Is it really anonymous?',
        a: 'Yes. We do not require your real name (pseudonyms are welcome), phone number, or address. We only need an email address to send you the booking confirmation and video link. Your privacy is our absolute priority.'
      }
    ]
  },
  {
    category: 'Sessions & Booking',
    items: [
      {
        q: 'When are sessions available?',
        a: 'Sessions are currently available on Sundays and Mondays. We offer multiple slots throughout the day, including late evenings (up to 8:45 PM IST) to accommodate working professionals.'
      },
      {
        q: 'How do the video calls work?',
        a: 'We use Jitsi Meet, a secure and encrypted video conferencing tool. You do not need to download any app. Simply click the link in your confirmation email at the scheduled time to join via your browser.'
      },
      {
        q: 'Can I keep my camera off?',
        a: 'Absolutely. While seeing each other can help build connection, you are welcome to keep your camera off if that makes you feel more comfortable. This is your space.'
      }
    ]
  },
  {
    category: 'Pricing & Payment',
    items: [
      {
        q: 'How much does it cost?',
        a: 'Each 45-minute session costs just ₹99. We believe mental support should be affordable for everyone, especially students and young professionals.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We use Razorpay, which supports all major Indian payment methods including UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, and Net Banking.'
      },
      {
        q: 'What is your cancellation policy?',
        a: 'Life happens. You can cancel your session up to 24 hours in advance for a full refund. Cancellations made less than 24 hours before the session are non-refundable.'
      }
    ]
  }
];

// Flatten FAQs for Schema
const flatFaqs = faqs.flatMap(cat => cat.items.map(item => ({ question: item.q, answer: item.a })));

export default function FAQPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://hidden-depths-web.pages.dev' },
    { name: 'FAQ', url: 'https://hidden-depths-web.pages.dev/faq' },
  ];

  return (
    <>
      <FAQSchema faqs={flatFaqs} />
      <BreadcrumbSchema items={breadcrumbs} />

      <main className="min-h-screen bg-black text-white pt-24 pb-20">
        <section className="relative px-4 sm:px-6 lg:px-8 mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-[var(--accent)]">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-400 font-light">
              Everything you need to know about your journey with Hidden Depths.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-6 space-y-12">
          {faqs.map((category, idx) => (
            <div key={idx} className="space-y-6">
              <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">
                {category.category}
              </h2>
              <div className="grid gap-6">
                {category.items.map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-[var(--accent)]/30 transition-all">
                    <h3 className="text-lg font-medium text-[var(--accent)] mb-3">{item.q}</h3>
                    <p className="text-gray-300 leading-relaxed text-sm md:text-base">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-16 text-center bg-[var(--accent)]/10 p-8 rounded-2xl border border-[var(--accent)]/20">
            <h3 className="text-xl font-serif mb-4 text-white">Still have questions?</h3>
            <p className="text-gray-400 mb-6 text-sm">
              We&apos;re here to help. Reach out to our support team or book a session to experience it yourself.
            </p>
            <div className="flex justify-center gap-4">
               <a href="mailto:support@hiddendepths.com" className="px-6 py-3 border border-white/20 rounded-full hover:bg-white/10 transition-colors text-sm uppercase tracking-wider">
                 Contact Support
               </a>
               <Link href="/booking" className="px-6 py-3 bg-[var(--accent)] text-black rounded-full font-bold hover:bg-[var(--accent)]/90 transition-colors text-sm uppercase tracking-wider">
                 Book Session
               </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
