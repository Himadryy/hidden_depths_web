'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import BookingCalendar from '@/components/BookingCalendar';
import AuthModal from '@/components/AuthModal';

export default function BookingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setShowAuth(true);
    } else {
      setShowAuth(false);
      setShowBooking(true);
    }
  }, [user, authLoading]);

  const handleAuthClose = () => {
    setShowAuth(false);
    if (user) {
      setShowBooking(true);
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
        <div className="fixed inset-0 h-[100dvh] z-[60] bg-[var(--background)] overscroll-none">
          <BookingCalendar onClose={handleBookingClose} />
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
