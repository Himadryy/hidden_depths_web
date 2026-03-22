'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';

export default function AboutSection() {
  return (
    <section id="about" className="section-bloom bg-[var(--glass-panel)]">
      <Container>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Image/Avatar Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square max-w-md mx-auto rounded-[var(--radius-xl)] bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 flex items-center justify-center relative overflow-hidden">
              <span className="text-white text-6xl md:text-8xl font-serif font-bold opacity-80">
                HD
              </span>
              {/* Decorative pattern */}
              <div className="absolute inset-0 dot-pattern opacity-10" />
              {/* Glow effect */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
            </div>
            
            {/* Stats cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-4 -right-4 md:bottom-8 md:-right-8 bg-[var(--background)] p-4 rounded-[var(--radius-lg)] shadow-lg border border-[var(--glass-border)]"
            >
              <div className="text-2xl md:text-3xl font-bold text-[var(--accent)]">100%</div>
              <div className="text-xs text-[var(--text-muted)]">Confidential</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="absolute -top-4 -left-4 md:top-8 md:-left-8 bg-[var(--background)] p-4 rounded-[var(--radius-lg)] shadow-lg border border-[var(--glass-border)]"
            >
              <div className="text-2xl md:text-3xl font-bold text-[var(--accent)]">₹99</div>
              <div className="text-xs text-[var(--text-muted)]">Per Session</div>
            </motion.div>
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-3 md:px-4 py-2 mb-4 text-xs md:text-sm font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              About Me
            </span>
            
            <h2 className="heading-section font-serif text-[var(--foreground)] mb-4 md:mb-6">
              Your Friend in the Shadows
            </h2>
            
            <div className="space-y-4 text-sm md:text-body mb-6 md:mb-8">
              <p>
                Hi, I&apos;m the person behind Hidden Depths. I started this because I know what it&apos;s like 
                to feel alone with your thoughts, to have no one who truly listens without judging.
              </p>
              <p>
                I&apos;m not a licensed therapist – I want to be upfront about that. What I am is someone 
                who has been through dark times and come out the other side. Someone who has spent years 
                learning how to listen, truly listen, and help others find clarity in their chaos.
              </p>
              <p>
                Sometimes you don&apos;t need a clinical diagnosis or a prescription. Sometimes you just 
                need a compassionate human being who will sit with you in the darkness without trying 
                to immediately fix everything.
              </p>
              <p className="font-medium text-[var(--foreground)]">
                That&apos;s what I offer – a judgment-free space where your secrets are safe, 
                your feelings are valid, and you&apos;re never alone.
              </p>
            </div>

            {/* Key Points */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
              {[
                { icon: '🤫', text: 'Anonymous Sessions' },
                { icon: '💜', text: 'No Judgment Ever' },
                { icon: '🔒', text: 'Your Secrets Are Safe' },
                { icon: '🇮🇳', text: 'Based in India' },
              ].map((point) => (
                <div key={point.text} className="flex items-center gap-2 text-xs md:text-sm">
                  <span className="text-lg">{point.icon}</span>
                  <span className="text-[var(--text-muted)]">{point.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link href="/booking">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Book a Session
                </Button>
              </Link>
              <Link href="mailto:hiddendepthsss@gmail.com">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Email Me
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
