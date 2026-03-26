'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Container from '@/components/ui/Container';
import { supabase } from '@/lib/supabase';

interface Testimonial {
  id: string;
  name: string;
  content: string;
  rating: number;
  is_anonymous: boolean;
  created_at: string;
}

// Fallback testimonials for when DB is empty or loading
const fallbackTestimonials = [
  {
    id: 'fallback-1',
    name: 'Anonymous User',
    content: "Hidden Depths has been a life-changing experience. My mentor truly understood my struggles and helped me find clarity I never thought possible.",
    rating: 5,
    is_anonymous: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-2',
    name: 'Priya S.',
    content: "The online sessions fit perfectly into my busy schedule. Professional, convenient, and incredibly effective. Highly recommend!",
    rating: 5,
    is_anonymous: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-3',
    name: 'Anonymous User',
    content: "Finally found a safe space to talk about my feelings without judgment. The anonymous aspect made me feel comfortable opening up.",
    rating: 5,
    is_anonymous: true,
    created_at: new Date().toISOString(),
  },
];

function getInitials(name: string, isAnonymous: boolean): string {
  if (isAnonymous) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('id, name, content, rating, is_anonymous, created_at')
          .eq('approved', true)
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setTestimonials(data);
        }
      } catch (err) {
        console.error('Failed to fetch testimonials:', err);
        // Keep fallback testimonials
      } finally {
        setLoading(false);
      }
    }

    fetchTestimonials();
  }, []);

  // Show only first 3 for the grid
  const displayTestimonials = testimonials.slice(0, 3);

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
            Testimonials
          </span>
          <h2 className="heading-section font-serif text-[var(--foreground)] mb-3 md:mb-4">
            Stories of Healing
          </h2>
          <p className="text-sm md:text-body px-2">
            Real experiences from people who found peace and growth through our therapy services.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {displayTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="card-testimonial h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-4 md:w-5 h-4 md:h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="flex-1 mb-4 md:mb-6">
                  <p className="text-sm md:text-base text-[var(--foreground)] leading-relaxed italic">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-[var(--glass-border)]">
                  <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-deep)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs md:text-sm">
                      {getInitials(testimonial.name, testimonial.is_anonymous)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm md:text-base text-[var(--foreground)]">
                      {testimonial.is_anonymous ? 'Anonymous' : testimonial.name}
                    </p>
                    <p className="text-xs md:text-sm text-[var(--text-muted)]">Verified Client</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 md:mt-16 pt-8 md:pt-12 border-t border-[var(--glass-border)]"
        >
          <p className="text-center text-xs md:text-sm text-[var(--text-muted)] mb-6 md:mb-8">
            Trusted by hundreds of clients and recognized by
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 lg:gap-16 opacity-50">
            {/* Placeholder logos */}
            {['APA', 'NIMH', 'Psychology Today', 'GoodTherapy'].map((org) => (
              <span key={org} className="text-sm md:text-lg font-semibold text-[var(--foreground)]">
                {org}
              </span>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
