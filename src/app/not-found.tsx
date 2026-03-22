import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--background)]">
      {/* Decorative background */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-[var(--accent-warm)]/10 rounded-full blur-3xl" />

      <div className="z-10 text-center space-y-8 px-4">
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

        <Link 
          href="/"
          className="inline-block px-8 py-3 mt-8 bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] transition-all duration-300 rounded-full text-sm font-medium"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}