'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, CheckCircle, Calendar as CalendarIcon, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import {
  getBookedSlots,
  getBookingPolicy,
  getBookingStatus,
  createBooking,
  verifyPayment,
  cancelPendingBooking,
  type BookingPolicy,
} from '@/lib/bookingService';
import { useAuth } from '@/context/AuthProvider';
import { getApiUrl, fetchWithTimeout } from '@/lib/api';
import Script from 'next/script';

// Razorpay types
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayError {
  error?: {
    description?: string;
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: {
    address: string;
  };
  theme: {
    color: string;
  };
}

interface RazorpayInstance {
  on: (event: string, handler: (response: RazorpayError) => void) => void;
  open: () => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

type ViewState = 'calendar' | 'slots' | 'form' | 'success';

const FALLBACK_TIME_SLOTS = [
  '11:00 AM', '11:45 AM', '12:30 PM',
  '08:00 PM', '08:45 PM'
];

const parseDateStringToLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const computeFallbackAvailableDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < 21 && dates.length < 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 1) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
  }
  return dates;
};

const FALLBACK_POLICY: BookingPolicy = {
  safe_mode: true,
  search_window_days: 21,
  max_bookable_dates: 2,
  allowed_weekdays: [0, 1],
  time_slots: FALLBACK_TIME_SLOTS,
  available_dates: computeFallbackAvailableDates(),
};

// Helper to check if a time slot is in the past relative to now
const isTimePast = (timeStr: string, selectedDate: Date | null): boolean => {
    if (!selectedDate) return false;
    
    const now = new Date();
    const isToday = selectedDate.getDate() === now.getDate() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getFullYear() === now.getFullYear();
    
    if (!isToday) return false;

    const [time, modifier] = timeStr.split(' ');
    const parts = time.split(':').map(Number);
    let hours = parts[0];
    const minutes = parts[1];
    
    if (hours === 12 && modifier === 'AM') hours = 0;
    if (hours !== 12 && modifier === 'PM') hours += 12;

    const slotDate = new Date(selectedDate);
    slotDate.setHours(hours, minutes, 0, 0);

    return slotDate < now;
};

// DATE LOGIC: Payment Required after Feb 2nd, 2026
const PAYMENT_START_DATE = new Date('2026-02-03');
const SESSION_PRICE = "₹99";

const isPaidSession = (date: Date | null): boolean => {
    if (!date) return false;
    return date >= PAYMENT_START_DATE;
};

// Helper to ensure consistent Date format for DB (YYYY-MM-DD)
const formatDateForDB = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

export default function BookingCalendar({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [view, setView] = useState<ViewState>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Database State
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, number>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [bookingPolicy, setBookingPolicy] = useState<BookingPolicy | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(true);

  // Pre-fill if user exists
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Inline error message (replaces alert())
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-clear error after 6 seconds
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(''), 6000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  useEffect(() => {
    let mounted = true;

    const loadPolicy = async () => {
      setIsLoadingPolicy(true);
      try {
        const policy = await getBookingPolicy();
        if (mounted) {
          setBookingPolicy(policy);
        }
      } catch {
        if (mounted) {
          setBookingPolicy(FALLBACK_POLICY);
          setErrorMsg('Live booking rules could not be loaded. Showing safe mode defaults.');
        }
      } finally {
        if (mounted) {
          setIsLoadingPolicy(false);
        }
      }
    };

    loadPolicy();
    return () => {
      mounted = false;
    };
  }, []);

  // Real-time updates via WebSockets
  useEffect(() => {
    const rawApiUrl = getApiUrl();
    if (!rawApiUrl) return;

    const wsUrl = rawApiUrl.replace(/^http/, 'ws') + '/ws';
    let socket: WebSocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 8;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let disposed = false;

    const connect = () => {
        if (disposed) return;
        
        try {
            socket = new WebSocket(wsUrl);
        } catch {
            // WebSocket constructor can throw on invalid URLs
            return;
        }

        socket.onopen = () => {
            reconnectAttempts = 0;
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const { type, payload } = message;

                if (!selectedDate) return;
                const currentDateStr = formatDateForDB(selectedDate);

                if (payload.date === currentDateStr) {
                    if (type === 'SLOT_BOOKED' || type === 'SLOT_PENDING') {
                        setBookedSlots(prev => Array.from(new Set([...prev, payload.time])));
                    } else if (type === 'SLOT_CANCELLED') {
                        setBookedSlots(prev => prev.filter(t => t !== payload.time));
                    }
                }
            } catch {
                // Silently ignore malformed messages
            }
        };

        socket.onerror = () => {
            // Errors are followed by close events — handle reconnection there
        };

        socket.onclose = () => {
            if (disposed) return;
            if (reconnectAttempts >= maxReconnectAttempts) return;
            
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            reconnectTimer = setTimeout(connect, delay);
        };
    };

    connect();

    // Reconnect when network comes back online
    const handleOnline = () => {
        if (socket?.readyState !== WebSocket.OPEN) {
            reconnectAttempts = 0;
            connect();
        }
    };
    window.addEventListener('online', handleOnline);

    return () => {
        disposed = true;
        window.removeEventListener('online', handleOnline);
        clearTimeout(reconnectTimer);
        socket?.close();
    };
  }, [selectedDate]);

  // Refresh slots for the currently selected date (called by visibility/focus/polling)
  const refreshSlots = useCallback(async () => {
    if (!selectedDate || view !== 'slots') return;
    
    try {
      const dateStr = formatDateForDB(selectedDate);
      const slots = await getBookedSlots(dateStr);
      setBookedSlots(slots);
    } catch {
      setErrorMsg('Could not refresh live availability. Please wait a moment and try again.');
    }
  }, [selectedDate, view]);

  // Refresh slots when tab regains focus or becomes visible (handles mobile/background scenarios)
  useEffect(() => {
    if (!selectedDate || view !== 'slots') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSlots();
      }
    };

    const handleFocus = () => {
      refreshSlots();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Periodic polling every 15 seconds as fallback when WebSocket is unreliable
    const pollInterval = setInterval(refreshSlots, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
  }, [selectedDate, view, refreshSlots]);

  // Dates sourced from backend booking policy to keep UI and server rules aligned.
  const availableDates = useMemo(() => {
    const sourceDates = bookingPolicy?.available_dates || FALLBACK_POLICY.available_dates;
    return sourceDates.map(parseDateStringToLocalDate);
  }, [bookingPolicy]);

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setView('slots');
    setIsLoadingSlots(true);
    setErrorMsg('');
    setBookedSlots([]); // Clear previous
    setRecommendations({});

    try {
        const dateStr = formatDateForDB(date);
        const apiUrl = getApiUrl();
        
        // Fetch Availability & Neural Recommendations in parallel
        const [slots, recRes] = await Promise.all([
            getBookedSlots(dateStr),
            apiUrl
                ? fetchWithTimeout(`${apiUrl}/bookings/recommendations/${dateStr}`)
                .then(res => res.ok ? res.json() : { data: {} })
                .catch(() => ({ data: {} }))
                : Promise.resolve({ data: {} })
        ]);

        setBookedSlots(slots);
        setRecommendations(recRes.data || {});
    } catch {
        setErrorMsg('Live availability could not be loaded. Please retry.');
    } finally {
        setIsLoadingSlots(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setView('form');
  };

  const waitForPaymentSettlement = async (bookingId: string): Promise<boolean> => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const status = await getBookingStatus(bookingId);
        if (status.payment_status === 'paid') {
          return true;
        }
        if (status.payment_status === 'failed') {
          return false;
        }
      } catch {
        // keep polling briefly for eventual consistency across verify/webhook paths
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    
    if (!selectedDate || !selectedTime) {
      setErrorMsg('Please choose a date and time.');
      setIsSubmitting(false);
      return;
    }

    const dateStr = formatDateForDB(selectedDate);

    try {
        // Pre-submit validation: re-check slot availability to prevent stale booking attempts
        const currentSlots = await getBookedSlots(dateStr);
        if (currentSlots.includes(selectedTime)) {
            setBookedSlots(currentSlots);
            setErrorMsg('This slot was just booked by someone else. Please select another time.');
            setView('slots');
            setIsSubmitting(false);
            return;
        }

        // 1. Initiate Booking (Create 'Pending' Slot & Razorpay Order if paid)
        const bookingResult = await createBooking(
            dateStr, 
            selectedTime, 
            name, 
            email, 
            user?.id
        );
        
        if (!bookingResult.success) {
            const err = bookingResult.error || "Booking failed.";
            setErrorMsg(err);
            setIsSubmitting(false);
            
            // On conflict/taken error, refresh slots view
            if (err.includes('booked') || err.includes('taken') || err.includes('unavailable') || err.includes('payment')) {
                setView('slots');
                handleDateClick(selectedDate);
            }
            return;
        }

        // 2. Handle Payment Flow
        if (bookingResult.order_id) {
            if (!window.Razorpay) {
                setErrorMsg("Payment gateway failed to load. Please refresh the page.");
                cancelPendingBooking(bookingResult.booking_id!);
                setIsSubmitting(false);
                return;
            }

            const pendingBookingId = bookingResult.booking_id!;

            const options: RazorpayOptions = {
                key: bookingResult.key_id!,
                amount: bookingResult.amount!,
                currency: bookingResult.currency!,
                name: "Hidden Depths",
                description: "Sanctuary Session",
                image: "https://hidden-depths-web.pages.dev/logo.png",
                order_id: bookingResult.order_id,
                handler: async function (response: RazorpayResponse) {
                    // 3. Verify Payment on Backend
                    const verify = await verifyPayment(
                        pendingBookingId,
                        response.razorpay_payment_id,
                        response.razorpay_order_id,
                        response.razorpay_signature
                    );
                    
                    if (verify.success) {
                        setView('success');
                    } else {
                        const settled = await waitForPaymentSettlement(pendingBookingId);
                        if (settled) {
                          setView('success');
                        } else {
                          setErrorMsg("Payment is processing. If charged, status will update automatically.");
                        }
                    }
                    setIsSubmitting(false);
                },
                modal: {
                    ondismiss: function () {
                        cancelPendingBooking(pendingBookingId);
                        setIsSubmitting(false);
                    }
                },
                prefill: {
                    name: name,
                    email: email,
                    contact: ""
                },
                notes: {
                    address: "Hidden Depths Digital Sanctuary"
                },
                theme: {
                    color: "#E0B873"
                }
            };
            
            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response: RazorpayError){
                setErrorMsg("Payment failed: " + (response.error?.description || "Please try again."));
                cancelPendingBooking(pendingBookingId);
                setIsSubmitting(false);
            });
            rzp1.open();
        } else {
            // Free Session - Already confirmed by createBooking
            setView('success');
            setIsSubmitting(false);
        }
    } catch {
        setErrorMsg("Could not complete booking right now. Please try again.");
        setIsSubmitting(false);
    }
  };

  const activePolicy = bookingPolicy || FALLBACK_POLICY;
  const activeTimeSlots = activePolicy.time_slots;
  const isSafeMode = activePolicy.safe_mode;

  // Styles using CSS Variables for Theming
  const buttonStyle = "flex items-center justify-between p-4 rounded-xl text-left transition-all group relative overflow-hidden font-serif";
  const passiveButtonStyle = "bg-[var(--background)] border border-glass text-muted hover:bg-[var(--accent)]/10 hover:border-[var(--accent)] hover:text-[var(--foreground)] shadow-sm";

  const renderCalendar = () => (
    <div className="space-y-6 h-full w-full max-w-full min-w-0 flex flex-col overflow-x-hidden">
        {/* Promotional Banner */}
        <div className="mt-10 md:mt-0 bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-3 rounded-lg text-center">
            <p className="text-xs md:text-sm font-bold text-[var(--accent)] tracking-wide uppercase">
                {isSafeMode ? '🛡️ Safe Mode: 2-Day Booking Window' : '✨ Limited Slots: Sundays & Mondays Only'}
            </p>
        </div>

        <div className="flex flex-col gap-2">
            <h3 className="text-2xl md:text-3xl font-serif text-theme">Select a Date</h3>
            <div className="h-px w-12 bg-[var(--accent)] opacity-50" />
            <p className="text-xs md:text-sm text-muted font-light mt-2">
              Showing {availableDates.length} live dates from booking policy.
            </p>
        </div>
        
        {/* Rolling List of Dates - Single column on mobile, 2 cols on tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar flex-1 min-w-0 w-full max-w-full">
            {isLoadingPolicy && (
              <div className="md:col-span-2 flex items-center justify-center py-6 text-muted text-xs uppercase tracking-widest">
                <Loader2 className="animate-spin mr-2" size={16} />
                Loading booking policy...
              </div>
            )}
            {availableDates.map((date, i) => {
                const isPaid = isPaidSession(date);
                return (
                    <button
                        key={i}
                        onClick={() => handleDateClick(date)}
                        className={`${buttonStyle} ${passiveButtonStyle}`}
                    >
                        <div className="z-10">
                            <span className="block text-lg md:text-xl">{date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                            <span className="text-sm opacity-60 font-sans tracking-wide">
                                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                {isPaid && <span className="ml-2 text-[var(--accent)] font-bold">• {SESSION_PRICE}</span>}
                            </span>
                        </div>
                        <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-[var(--accent)] z-10" />
                    </button>
                );
            })}
        </div>
    </div>
  );

  const renderSlots = () => {
    // Filter slots based on current time if "Today" is selected
    const visibleSlots = activeTimeSlots.filter(time => !isTimePast(time, selectedDate));
    
    // Find the highest scoring slot for the "Recommended" badge
    const maxScore = Math.max(...Object.values(recommendations), 0);
    const recommendedSlot = Object.keys(recommendations).find(k => recommendations[k] === maxScore && recommendations[k] > 0.7);

    return (
    <div className="space-y-8 h-full w-full max-w-full min-w-0 flex flex-col overflow-x-hidden">
        <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setView('calendar')} className="p-2 -ml-2 rounded-full hover:bg-[var(--foreground)]/5 text-muted hover:text-theme transition-colors">
                <ChevronLeft size={24} />
            </button>
            <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-serif text-theme">Select a Time</h3>
                <p className="text-xs font-sans text-[var(--accent)] tracking-widest uppercase">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>
        
        {isLoadingSlots ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="text-xs uppercase tracking-widest">Checking Availability...</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar pb-10 min-w-0 w-full max-w-full">
                {visibleSlots.length > 0 ? (
                    visibleSlots.map((time) => {
                        const isBooked = bookedSlots.includes(time);
                        const isRecommended = time === recommendedSlot;

                        return (
                            <button
                                key={time}
                                onClick={() => !isBooked && handleTimeSelect(time)}
                                disabled={isBooked}
                                className={`
                                    py-3 px-3 sm:py-4 sm:px-4 rounded-xl border flex flex-col items-center justify-center gap-1 group font-sans text-xs sm:text-sm tracking-wide shadow-sm transition-all relative min-w-0
                                    ${isBooked 
                                        ? 'bg-black/5 dark:bg-white/5 border-transparent text-muted/30 cursor-not-allowed decoration-slice line-through decoration-muted/30' 
                                        : isRecommended
                                            ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-bold ring-1 ring-[var(--accent)]/30'
                                            : 'bg-[var(--background)] border-glass text-muted hover:bg-[var(--accent)]/10 hover:border-[var(--accent)] hover:text-[var(--accent)]'
                                    }
                                `}
                            >
                                {isRecommended && !isBooked && (
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[var(--background)] text-[8px] font-black px-2 py-0.5 rounded-full tracking-tighter animate-pulse">
                                        RECOMMENDED
                                    </span>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className={isBooked ? "opacity-30" : "text-[var(--accent)]"} />
                                    {time}
                                </div>
                                {isBooked && <span className="sr-only">(Booked)</span>}
                            </button>
                        );
                    })
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center text-muted py-10 opacity-60">
                         <Clock size={32} className="mb-2" />
                         <p className="text-sm">No available slots for today.</p>
                    </div>
                )}
            </div>
        )}
    </div>
  )};

  const renderForm = () => {
    const isPaid = isPaidSession(selectedDate);
    
    return (
    <div className="space-y-6 h-full w-full max-w-full min-w-0 flex flex-col overflow-y-auto overflow-x-hidden pb-safe">
        <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => setView('slots')} className="p-2 -ml-2 rounded-full hover:bg-[var(--foreground)]/5 text-muted hover:text-theme transition-colors">
                <ChevronLeft size={24} />
            </button>
            <h3 className="text-2xl font-serif text-theme">Finalize Booking</h3>
        </div>
        
        {/* Inline Error Banner */}
        {errorMsg && (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm shrink-0"
            >
                <AlertTriangle size={18} className="shrink-0" />
                <p>{errorMsg}</p>
            </motion.div>
        )}

        <div className="bg-[var(--accent)]/5 p-6 rounded-2xl border border-[var(--accent)]/20 flex items-start gap-5 shrink-0">
            <div className="p-3 bg-[var(--background)] rounded-full text-[var(--accent)] shadow-sm">
                <CalendarIcon size={20} />
            </div>
            <div>
                <p className="text-theme font-serif text-xl mb-1">Introductory Session</p>
                <p className="text-muted text-sm font-sans mb-2">30 Minutes • Video Call</p>
                <div className="flex flex-col text-[var(--accent)] text-sm font-medium">
                    <span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    <span>{selectedTime}</span>
                </div>
                {isPaid && (
                     <div className="mt-2">
                        <div className="inline-flex items-center px-2 py-1 bg-[var(--accent)] text-[var(--background)] text-xs font-bold uppercase tracking-wider rounded w-fit">
                            Price: {SESSION_PRICE}
                        </div>
                     </div>
                )}
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col pb-24">
            <div className="space-y-2">
                <label htmlFor="booking-name" className="text-xs text-muted uppercase tracking-widest font-bold">Full Name</label>
                <input 
                    id="booking-name"
                    name="name"
                    type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[var(--background)] border border-glass rounded-xl p-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Enter your name"
                    autoComplete="name"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="booking-email" className="text-xs text-muted uppercase tracking-widest font-bold">Email Address</label>
                <input 
                    id="booking-email"
                    name="email"
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--background)] border border-glass rounded-xl p-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Enter your email"
                    autoComplete="email"
                />
            </div>

            <button 
                type="submit" disabled={isSubmitting}
                className="w-full bg-[var(--foreground)] text-[var(--background)] font-serif tracking-widest text-sm py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-auto disabled:opacity-50 shrink-0 mb-4"
            >
                {isSubmitting ? 'PROCESSING...' : (isPaid ? `PROCEED TO PAYMENT` : 'CONFIRM BOOKING')}
            </button>
        </form>
    </div>
  )};

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-full min-w-0 text-center space-y-8 py-10 px-4 overflow-x-hidden">
        <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} 
            className="w-24 h-24 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--background)] mb-4 shadow-xl shadow-[var(--accent)]/20"
        >
            <CheckCircle size={48} />
        </motion.div>
        <div className="space-y-4">
            <h3 className="text-4xl font-serif text-theme">Booking Confirmed</h3>
            <p className="text-muted max-w-md mx-auto leading-relaxed">
                Your sanctuary time is reserved for <br />
                <span className="text-[var(--accent)] font-bold">{selectedDate?.toLocaleDateString()}</span> at <span className="text-[var(--accent)] font-bold">{selectedTime}</span>.
            </p>
        </div>
        <button 
            onClick={onClose}
            className="mt-12 px-10 py-4 rounded-full border border-glass bg-[var(--background)] text-muted transition-all uppercase tracking-widest text-xs hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
            Return to Sanctuary
        </button>
    </div>
  );

  return (
    <>
    <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
    />
    <div 
        className="h-full w-full max-w-full min-w-0 flex flex-col overflow-hidden overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
    >
        <AnimatePresence mode='wait'>
            <motion.div
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 h-full w-full max-w-full min-w-0 overflow-x-hidden"
            >
                {view === 'calendar' && renderCalendar()}
                {view === 'slots' && renderSlots()}
                {view === 'form' && renderForm()}
                {view === 'success' && renderSuccess()}
            </motion.div>
        </AnimatePresence>
    </div>
    </>
  );
}
