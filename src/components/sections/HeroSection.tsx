'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-[var(--accent)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--accent-warm)]/5 rounded-full blur-3xl" />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <span className="inline-block px-3 md:px-4 py-2 mb-4 md:mb-6 text-xs md:text-sm font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              Professional Mental Health Care
            </span>

            <h1 className="heading-hero font-serif text-[var(--foreground)] mb-4 md:mb-6">
              When your head is full, you need a{' '}
              <span className="text-[var(--accent)]">space to think</span>
            </h1>

            <p className="text-sm md:text-body-lg mb-6 md:mb-8 max-w-lg">
              Find peace with our experienced therapists. We offer personalized care 
              to help you navigate life&apos;s challenges and discover your inner strength.
            </p>

            <div className="flex flex-wrap gap-3 md:gap-4">
              <Button variant="primary" size="lg">
                <Link href="/booking">Book a Session</Link>
              </Button>
              <Button variant="secondary" size="lg">
                <Link href="/about">Learn More</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12 pt-6 md:pt-8 border-t border-[var(--glass-border)]">
              <div>
                <p className="text-xl md:text-3xl font-bold text-[var(--accent)]">500+</p>
                <p className="text-xs md:text-sm text-[var(--text-muted)]">Clients Helped</p>
              </div>
              <div>
                <p className="text-xl md:text-3xl font-bold text-[var(--accent)]">15+</p>
                <p className="text-xs md:text-sm text-[var(--text-muted)]">Expert Therapists</p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-xl md:text-3xl font-bold text-[var(--accent)]">98%</p>
                <p className="text-xs md:text-sm text-[var(--text-muted)]">Satisfaction Rate</p>
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="relative mt-8 md:mt-0"
          >
            <div className="relative aspect-[4/5] rounded-[var(--radius-2xl)] overflow-hidden bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-warm)]/20">
              {/* Placeholder image - woman in therapy setting */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6 md:p-8">
                  <div className="w-24 md:w-32 h-24 md:h-32 mx-auto mb-3 md:mb-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                    <svg className="w-12 md:w-16 h-12 md:h-16 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs md:text-sm">
                    Hero image placeholder
                  </p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[var(--accent)] rounded-[var(--radius-xl)] opacity-20" />
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-[var(--accent-warm)] rounded-full opacity-20" />
            </div>

            {/* Floating card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute -bottom-2 -left-2 md:-bottom-6 md:-left-6 bg-[var(--card-bg)] rounded-[var(--radius-xl)] p-3 md:p-4 shadow-xl border border-[var(--card-border)]"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 md:w-6 h-5 md:h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-xs md:text-sm text-[var(--foreground)]">Available Now</p>
                  <p className="text-xs md:text-sm text-[var(--text-muted)]">Book your first session</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
