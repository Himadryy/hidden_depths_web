'use client';

import { motion } from 'framer-motion';
import Container from '@/components/ui/Container';
import Card from '@/components/ui/Card';

const services = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: '1-on-1 Mentorship',
    description: 'Private sessions where you can share anything on your mind. I listen without judgment and help you find clarity.',
    features: ['Completely Anonymous', 'Non-judgmental', 'Confidential'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Emotional Support',
    description: 'Sometimes you just need someone to listen. I provide a compassionate ear and heartfelt emotional support.',
    features: ['Active Listening', 'Empathetic Response', 'Safe Space'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Stress Relief',
    description: 'Learn practical techniques to manage daily stress and find balance in your hectic life.',
    features: ['Breathing Techniques', 'Mindfulness Tips', 'Practical Advice'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Life Guidance',
    description: 'Facing a difficult decision? I help you explore your options and find the path that feels right for you.',
    features: ['Career Confusion', 'Relationship Issues', 'Life Transitions'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Online Sessions',
    description: 'Connect from anywhere in India. All sessions are conducted online for your convenience and privacy.',
    features: ['Flexible Timing', 'No Travel Needed', 'Private & Secure'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Affordable at ₹99',
    description: 'Quality emotional support shouldn\'t break the bank. Each session is just ₹99 - accessible to everyone.',
    features: ['No Hidden Fees', 'Secure Payment', 'Money-back Guarantee'],
  },
];

export default function ServicesSection() {
  return (
    <section className="section-bloom bg-[var(--background)]">
      <Container>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
        >
          <span className="inline-block px-3 md:px-4 py-2 mb-3 md:mb-4 text-xs md:text-sm font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            How I Can Help
          </span>
          <h2 className="heading-section font-serif text-[var(--foreground)] mb-3 md:mb-4">
            A Listening Ear When You Need It Most
          </h2>
          <p className="text-sm md:text-body px-2">
            I&apos;m not a licensed therapist, but I&apos;m a trained listener who cares. 
            Sometimes that&apos;s exactly what you need.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="service" className="h-full">
                <div className="w-12 md:w-14 h-12 md:h-14 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] mb-4 md:mb-6">
                  {service.icon}
                </div>
                <h3 className="heading-card font-serif text-[var(--foreground)] mb-2 md:mb-3">
                  {service.title}
                </h3>
                <p className="text-sm md:text-body mb-3 md:mb-4">
                  {service.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {service.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs px-2 md:px-3 py-1 rounded-full bg-[var(--glass-panel)] text-[var(--text-muted)]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 md:mt-12 p-4 md:p-6 rounded-[var(--radius-xl)] bg-amber-500/10 border border-amber-500/20"
        >
          <p className="text-xs md:text-sm text-center text-[var(--foreground)]">
            <strong>Important:</strong> Hidden Depths provides peer emotional support and wellness mentorship. 
            I am not a licensed therapist or medical professional. If you&apos;re experiencing a mental health crisis, 
            please contact emergency services or a qualified mental health professional.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
