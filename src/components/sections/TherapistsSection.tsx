'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const therapists = [
  {
    name: 'Dr. Sarah Mitchell',
    title: 'Clinical Psychologist',
    specialties: ['Anxiety', 'Depression', 'Trauma'],
    experience: '12 years',
    available: true,
    initials: 'SM',
    color: 'from-violet-400 to-purple-500',
  },
  {
    name: 'Dr. Michael Chen',
    title: 'Marriage & Family Therapist',
    specialties: ['Couples', 'Family', 'Communication'],
    experience: '8 years',
    available: true,
    initials: 'MC',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    name: 'Dr. Emily Rodriguez',
    title: 'Licensed Counselor',
    specialties: ['Stress', 'Life Transitions', 'Self-Esteem'],
    experience: '10 years',
    available: false,
    initials: 'ER',
    color: 'from-rose-400 to-pink-500',
  },
  {
    name: 'Dr. James Williams',
    title: 'Cognitive Behavioral Specialist',
    specialties: ['CBT', 'OCD', 'Phobias'],
    experience: '15 years',
    available: true,
    initials: 'JW',
    color: 'from-emerald-400 to-teal-500',
  },
];

export default function TherapistsSection() {
  return (
    <section className="section-bloom bg-[var(--glass-panel)]">
      <Container>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div className="max-w-xl">
            <span className="inline-block px-4 py-2 mb-4 text-sm font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              Our Team
            </span>
            <h2 className="heading-section font-serif text-[var(--foreground)] mb-4">
              Meet Our Expert Therapists
            </h2>
            <p className="text-body">
              Our licensed professionals are here to guide you on your journey to better mental health.
            </p>
          </div>
          <Button variant="secondary">
            <Link href="/about#therapists">View All Therapists</Link>
          </Button>
        </motion.div>

        {/* Therapists Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {therapists.map((therapist, index) => (
            <motion.div
              key={therapist.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="card-therapist">
                {/* Avatar */}
                <div className={`aspect-[4/3] bg-gradient-to-br ${therapist.color} flex items-center justify-center relative overflow-hidden`}>
                  <span className="text-white text-4xl font-serif font-bold opacity-80">
                    {therapist.initials}
                  </span>
                  {/* Decorative pattern */}
                  <div className="absolute inset-0 dot-pattern opacity-10" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {therapist.name}
                    </h3>
                    {therapist.available && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Available" />
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    {therapist.title} • {therapist.experience}
                  </p>
                  
                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {therapist.specialties.map((specialty) => (
                      <Badge key={specialty} variant="default" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  {/* Book Button */}
                  <Link
                    href="/booking"
                    className="block w-full text-center py-2 rounded-full text-sm font-medium text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)] hover:text-white transition-all duration-300"
                  >
                    Book Session
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
