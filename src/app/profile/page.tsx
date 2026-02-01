'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { motion } from 'framer-motion';
import { Calendar, Clock, Loader2, ArrowLeft, History, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Booking {
  id: string;
  date: string;
  time: string;
  name: string;
  email: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const fetchBookings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        
        // Use Go API if available
        if (apiUrl && token) {
            const res = await fetch(`${apiUrl}/bookings/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(data || []);
                return;
            }
        }

        // Fallback to Supabase
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setBookings(data || []);

      } catch (err) {
        console.error('Error loading bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, router]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this session? This action cannot be undone.')) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

        // API Call
        if (apiUrl && token) {
            const res = await fetch(`${apiUrl}/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                // Remove from state immediately
                setBookings(prev => prev.filter(b => b.id !== bookingId));
            } else {
                alert('Failed to cancel booking. Please try again.');
            }
            return;
        }

        // Supabase Fallback
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId)
            .eq('user_id', user!.id);

        if (error) throw error;
        setBookings(prev => prev.filter(b => b.id !== bookingId));

    } catch (err) {
        console.error("Cancellation error:", err);
        alert('Could not cancel booking.');
    }
  };

  const upcomingBookings = bookings.filter(b => new Date(`${b.date}T${convertTo24Hour(b.time)}`) >= new Date());
  const pastBookings = bookings.filter(b => new Date(`${b.date}T${convertTo24Hour(b.time)}`) < new Date());

  // Helper to parse "05:30 PM" to "17:30" for comparison
  function convertTo24Hour(timeStr: string) {
    const [time, modifier] = timeStr.split(' ');
    // eslint-disable-next-line prefer-const
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
    return `${hours}:${minutes}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-theme pt-32 px-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-12">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="font-serif text-4xl text-[var(--accent)] mb-2">My Sanctuary</h1>
                    <p className="text-muted text-sm">Welcome back, {user?.email?.split('@')[0] || 'Traveler'}.</p>
                </div>
                <button 
                    onClick={() => router.push('/')}
                    className="self-start px-6 py-3 border border-glass rounded-full text-xs font-bold uppercase tracking-widest hover:border-[var(--accent)] transition-all flex items-center gap-2"
                >
                    <ArrowLeft size={14} /> Back to Home
                </button>
            </div>

            {/* Upcoming Sessions */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <CalendarDays className="text-[var(--accent)]" size={20} />
                    <h2 className="font-serif text-2xl">Upcoming Sessions</h2>
                </div>
                
                {upcomingBookings.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {upcomingBookings.map((booking) => (
                            <motion.div 
                                key={booking.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 p-6 rounded-2xl relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="font-serif text-xl mb-1">Introductory Session</p>
                                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Confirmed</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[var(--background)] flex items-center justify-center border border-glass">
                                        <Clock size={18} className="text-muted" />
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-muted">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} />
                                        {booking.time} (30 mins)
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-glass flex gap-3">
                                    <button className="flex-1 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
                                        Join Link
                                    </button>
                                    <button 
                                        onClick={() => handleCancel(booking.id)}
                                        className="px-4 py-2 border border-glass text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 border border-glass border-dashed rounded-2xl text-center text-muted/50">
                        <p className="text-sm">No upcoming sessions scheduled.</p>
                    </div>
                )}
            </section>

            {/* Past History */}
            <section className="opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3 mb-6">
                    <History className="text-theme" size={20} />
                    <h2 className="font-serif text-2xl">Past Reflections</h2>
                </div>
                
                <div className="space-y-4">
                    {pastBookings.length > 0 ? (
                        pastBookings.map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl">
                                <div>
                                    <p className="font-serif text-theme">{new Date(booking.date).toLocaleDateString()}</p>
                                    <p className="text-xs text-muted">{booking.time}</p>
                                </div>
                                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest rounded-full">
                                    Completed
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted italic">Your journey hasn&apos;t started yet.</p>
                    )}
                </div>
            </section>
        </div>
    </div>
  );
}
