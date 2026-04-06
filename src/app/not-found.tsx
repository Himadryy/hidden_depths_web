import Link from 'next/link';
import { Home, Calendar, HelpCircle, Mail } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--background)]">
      {/* Decorative background */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-[var(--accent-warm)]/10 rounded-full blur-3xl" />

      <div className="z-10 text-center space-y-8 px-4 max-w-2xl mx-auto">
        <h1 className="font-serif text-8xl md:text-9xl text-[var(--accent)] opacity-80">404</h1>
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-light tracking-wide font-serif text-[var(--foreground)]">
            Page Not Found
          </h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            The page you are looking for doesn&apos;t exist or has been moved. 
            Let&apos;s get you back on track.
          </p>
        </div>

        {/* Quick navigation links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <Link
            href="/"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--card)]/50 border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
          >
            <Home className="w-5 h-5 text-[var(--accent)]" />
            <span className="text-sm text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
              Home
            </span>
          </Link>
          <Link
            href="/booking"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--card)]/50 border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
          >
            <Calendar className="w-5 h-5 text-[var(--accent)]" />
            <span className="text-sm text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
              Book Session
            </span>
          </Link>
          <Link
            href="/faq"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--card)]/50 border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
          >
            <HelpCircle className="w-5 h-5 text-[var(--accent)]" />
            <span className="text-sm text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
              FAQ
            </span>
          </Link>
          <Link
            href="/contact"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--card)]/50 border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
          >
            <Mail className="w-5 h-5 text-[var(--accent)]" />
            <span className="text-sm text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
              Contact
            </span>
          </Link>
        </div>

        <Link 
          href="/"
          className="inline-block px-8 py-3 mt-4 bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] transition-all duration-300 rounded-full text-sm font-medium"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}