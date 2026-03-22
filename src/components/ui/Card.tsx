'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  variant?: 'default' | 'service' | 'therapist' | 'testimonial';
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({
  variant = 'default',
  children,
  className = '',
  hover = true,
  onClick,
}: CardProps) {
  const baseStyles = 'bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-xl)] transition-all duration-300';
  
  const variants = {
    default: 'p-6',
    service: 'p-8',
    therapist: 'overflow-hidden',
    testimonial: 'p-8',
  };

  const hoverStyles = hover ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--accent)]/10' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </motion.div>
  );
}
