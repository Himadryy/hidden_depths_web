'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { createBooking } from '@/lib/bookingService';
import { sendBookingEmail } from '@/lib/email';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  
  // Extract data passed back from Stripe (we will configure Stripe to send these)
  const name = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';

  useEffect(() => {
    const finalizePaidBooking = async () => {
      if (!name || !email || !date || !time) {
        setStatus('error');
        return;
      }

      try {
        // 1. Save to Supabase
        const result = await createBooking(date, time, name, email);
        
        if (result.success) {
          // 2. Send Confirmation Email
          const dateObj = new Date(date);
          const dateReadable = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          });

          await sendBookingEmail({
            name,
            email,
            date: dateReadable,
            time,
            duration: "30 Minutes",
          });

          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error("Finalization error:", err);
        setStatus('error');
      }
    };

    finalizePaidBooking();
  }, [name, email, date, time]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {status === 'processing' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
            <h1 className="font-serif text-2xl text-theme uppercase tracking-widest">Securing your session...</h1>
            <p className="text-muted text-sm italic">Please do not close this window.</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <div className="w-20 h-20 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--background)] mx-auto shadow-xl">
              <CheckCircle size={40} />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-4xl text-theme">Payment Successful</h1>
              <p className="text-muted">Your time in the sanctuary is confirmed.</p>
            </div>
            
            <div className="bg-glass border border-glass rounded-2xl p-6 space-y-4 text-left">
              <div className="flex items-center gap-4 text-theme">
                <Calendar className="text-[var(--accent)]" size={20} />
                <span className="font-serif">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-4 text-theme">
                <Clock className="text-[var(--accent)]" size={20} />
                <span className="font-sans">{time}</span>
              </div>
            </div>

            <button 
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-muted hover:text-[var(--accent)] transition-colors text-sm uppercase tracking-widest font-bold"
            >
              <ArrowLeft size={16} /> Return to Sanctuary
            </button>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h1 className="font-serif text-2xl text-theme">Something went wrong</h1>
            <p className="text-muted text-sm">We couldn't finalize your booking automatically. Please contact us with your payment receipt.</p>
            <button 
              onClick={() => router.push('/')}
              className="px-8 py-3 bg-[var(--foreground)] text-[var(--background)] rounded-full text-sm font-bold uppercase tracking-widest"
            >
              Back to Home
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
        </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
