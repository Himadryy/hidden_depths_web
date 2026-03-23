'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import BookingCalendar from '@/components/BookingCalendar';
import AuthModal from '@/components/AuthModal';

export default function BookingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Derive state from auth instead of using setState in useEffect
  const showAuth = useMemo(() => !authLoading && !user, [authLoading, user]);
  const showBooking = useMemo(() => !authLoading && !!user, [authLoading, user]);

  const handleAuthClose = () => {
    // Auth state change will automatically update showAuth/showBooking via useMemo
    // If user closes auth modal without logging in, redirect home
    if (!user) {
      router.push('/');
    }
  };

  const handleBookingClose = () => {
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Auth modal for unauthenticated users */}
      {showAuth && (
        <AuthModal isOpen={true} onClose={handleAuthClose} defaultMode="signin" />
      )}

      {/* Booking calendar shown after authentication */}
      {showBooking && (
        <div className="fixed inset-0 h-[100dvh] w-full z-[60] bg-[var(--background)] overscroll-none overflow-hidden">
          <div className="h-full w-full max-w-full overflow-x-hidden overflow-y-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl h-full py-6">
              {/* Back to Home Link */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 mb-4 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
              <BookingCalendar onClose={handleBookingClose} />
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {authLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
        </div>
      )}
    </main>
  );
}
