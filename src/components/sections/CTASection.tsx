'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';

export default function CTASection() {
  return (
    <section className="section-bloom bg-gradient-to-br from-[var(--accent)] to-[var(--accent-deep)] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 dot-pattern opacity-10" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto px-4"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-white mb-4 md:mb-6">
            Ready to Talk to Someone Who Understands?
          </h2>
          <p className="text-sm md:text-lg text-white/80 mb-6 md:mb-8 max-w-2xl mx-auto">
            Take the first step today. I&apos;m here to listen without judgment, 
            help you find clarity, and support you through whatever you&apos;re facing.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 md:gap-4 mb-8 md:mb-12">
            <Button
              variant="primary"
              size="lg"
              className="bg-white text-[var(--accent)] hover:bg-white/90 hover:text-[var(--accent-deep)]"
            >
              <Link href="/booking">Book Your First Session — ₹99</Link>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 hover:border-white/50"
            >
              <Link href="#about">Learn About Me</Link>
            </Button>
          </div>

          {/* Contact info */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-6 lg:gap-8 text-white/60 text-xs md:text-sm">
            <a href="mailto:hiddendepthsss@gmail.com" className="hover:text-white transition-colors">
              hiddendepthsss@gmail.com
            </a>
            <span className="hidden sm:inline">•</span>
            <span className="text-white/40">Based in India 🇮🇳</span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
