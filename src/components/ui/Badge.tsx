import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'success' | 'warning';
  className?: string;
}

export default function Badge({ 
  children, 
  variant = 'default',
  className = '' 
}: BadgeProps) {
  const variants = {
    default: 'bg-[var(--accent)]/10 text-[var(--accent)]',
    outline: 'bg-transparent border border-[var(--accent)]/30 text-[var(--accent)]',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
