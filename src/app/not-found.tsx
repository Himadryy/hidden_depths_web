'use client';

import Link from 'next/link';
import CausticOcean from '@/components/CausticOcean';

export default function NotFound() {
  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* New Abyssal Light background */}
      <div className="absolute inset-0 z-0 opacity-70">
        <CausticOcean />
      </div>

      <div className="z-10 text-center space-y-8 px-4">
        <h1 className="font-serif text-8xl md:text-9xl text-gold opacity-80">404</h1>
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-light tracking-wide font-serif italic">
            You have ventured too deep.
          </h2>
          <p className="text-white/60 max-w-md mx-auto">
            The page you are looking for does not exist in this reality. 
            Return to the sanctuary.
          </p>
        </div>

        <Link 
          href="/"
          className="inline-block px-8 py-3 mt-8 border border-gold/30 text-gold hover:bg-gold hover:text-black transition-all duration-300 rounded-full uppercase tracking-widest text-sm font-serif"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}