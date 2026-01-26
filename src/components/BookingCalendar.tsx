'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, CheckCircle, Calendar as CalendarIcon, ArrowRight, Loader2 } from 'lucide-react';
import { sendBookingEmail } from '@/lib/email';
import { getBookedSlots, createBooking } from '@/lib/bookingService';

type ViewState = 'calendar' | 'slots' | 'form' | 'success';

const TIME_SLOTS = [
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
];

// Helper to check if a time slot is in the past relative to now
const isTimePast = (timeStr: string, selectedDate: Date | null): boolean => {
    if (!selectedDate) return false;
    
    const now = new Date();
    // Check if selected date is today (ignoring time)
    const isToday = selectedDate.getDate() === now.getDate() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getFullYear() === now.getFullYear();
    
    if (!isToday) return false;

    // Parse time string "12:00 PM"
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
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
// Uses local time to avoid timezone offset issues
const formatDateForDB = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

export default function BookingCalendar({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<ViewState>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Database State
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logic: Get next available Sundays and Mondays starting from Feb 1st till mid-Feb
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    
    // Find the next Sunday (Feb 1st, 2026)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (7 - today.getDay())); 

    // Loop through 16 days from the next Sunday to cover up to Feb 16th
    for (let i = 0; i < 16; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const day = d.getDay();
        
        // 0 = Sunday, 1 = Monday
        if (day === 0 || day === 1) {
            dates.push(d);
        }
    }
    return dates;
  }, []);

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setView('slots');
    setIsLoadingSlots(true);
    setBookedSlots([]); // Clear previous

    try {
        const dateStr = formatDateForDB(date);
        const slots = await getBookedSlots(dateStr);
        setBookedSlots(slots);
    } catch (err) {
        console.error("Failed to load slots", err);
    } finally {
        setIsLoadingSlots(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!selectedDate || !selectedTime) return;

    // CHECK: Is this a paid session?
    if (isPaidSession(selectedDate)) {
        // PAYMENT WALL: Safely prevent booking for now
        alert(`Information:\n\nSessions starting from Feb 8th are Paid Sessions (${SESSION_PRICE}).\n\nOur secure Razorpay integration is currently being finalized. Please check back soon or book a Free Session on Feb 1st or Feb 2nd.`);
        setIsSubmitting(false);
        return;
    }

    const dateStr = formatDateForDB(selectedDate);
    const dateReadable = selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    try {
        // 1. Secure the Booking in DB (The "Professional" Part)
        const bookingResult = await createBooking(dateStr, selectedTime, name, email);
        
        if (!bookingResult.success) {
            alert(bookingResult.error || "Booking failed.");
            setIsSubmitting(false);
            
            // If it was taken, refresh the slots to show the user
            if (bookingResult.error?.includes('just booked')) {
                setView('slots');
                handleDateClick(selectedDate); // Refresh slots
            }
            return;
        }

        // 2. Send Notification Email (The "Notification" Part)
        // We do this AFTER securing the slot, so if email fails, the slot is still theirs.
        try {
            await sendBookingEmail({
                name,
                email,
                date: dateReadable,
                time: selectedTime,
                duration: "30 Minutes",
            });
        } catch (emailError) {
            console.warn("Email failed to send, but booking is secured in DB.", emailError);
            // Optionally warn user, but usually success is better UX here since DB is truth
        }
        
        console.log("Booking system success!");
        setIsSubmitting(false);
        setView('success');
    } catch (error) {
        console.error("Booking Error:", error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (error as any)?.message || "System error. Please try again.";
        alert(`Booking Failed: ${msg}`);
        setIsSubmitting(false);
    }
  };

  // Styles using CSS Variables for Theming
  const buttonStyle = "flex items-center justify-between p-4 rounded-xl text-left transition-all group relative overflow-hidden font-serif";
  const passiveButtonStyle = "bg-[var(--background)] border border-glass text-muted hover:bg-[var(--accent)]/10 hover:border-[var(--accent)] hover:text-[var(--foreground)] shadow-sm";

  const renderCalendar = () => (
    <div className="space-y-6 h-full flex flex-col">
        {/* Promotional Banner */}
        <div className="mt-10 md:mt-0 bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-3 rounded-lg text-center">
            <p className="text-xs md:text-sm font-bold text-[var(--accent)] tracking-wide uppercase">
                ✨ First Week Special: Sundays & Mondays are FREE!
            </p>
        </div>

        <div className="flex flex-col gap-2">
            <h3 className="text-2xl md:text-3xl font-serif text-theme">Select a Date</h3>
            <div className="h-px w-12 bg-[var(--accent)] opacity-50" />
            <p className="text-xs md:text-sm text-muted font-light mt-2">Available Sundays & Mondays.</p>
        </div>
        
        {/* Rolling List of Dates - Single column on mobile, 2 cols on tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
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
    const visibleSlots = TIME_SLOTS.filter(time => !isTimePast(time, selectedDate));

    return (
    <div className="space-y-8 h-full flex flex-col">
        <div className="flex items-center gap-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
                {visibleSlots.length > 0 ? (
                    visibleSlots.map((time) => {
                        const isBooked = bookedSlots.includes(time);
                        return (
                            <button
                                key={time}
                                onClick={() => !isBooked && handleTimeSelect(time)}
                                disabled={isBooked}
                                className={`
                                    py-4 px-4 rounded-xl border flex items-center justify-center gap-2 group font-sans text-sm tracking-wide shadow-sm transition-all
                                    ${isBooked 
                                        ? 'bg-black/5 dark:bg-white/5 border-transparent text-muted/30 cursor-not-allowed decoration-slice line-through decoration-muted/30' 
                                        : 'bg-[var(--background)] border-glass text-muted hover:bg-[var(--accent)]/10 hover:border-[var(--accent)] hover:text-[var(--accent)]'
                                    }
                                `}
                            >
                                <Clock size={14} className={isBooked ? "opacity-30" : "text-[var(--accent)]"} />
                                {time}
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
    <div className="space-y-8 h-full flex flex-col">
        <div className="flex items-center gap-4">
            <button onClick={() => setView('slots')} className="p-2 -ml-2 rounded-full hover:bg-[var(--foreground)]/5 text-muted hover:text-theme transition-colors">
                <ChevronLeft size={24} />
            </button>
            <h3 className="text-2xl font-serif text-theme">Finalize Booking</h3>
        </div>
        
        <div className="bg-[var(--accent)]/5 p-6 rounded-2xl border border-[var(--accent)]/20 flex items-start gap-5">
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
                {/* Price Tag Display */}
                {isPaid && (
                     <div className="mt-2 inline-flex items-center px-2 py-1 bg-[var(--accent)] text-[var(--background)] text-xs font-bold uppercase tracking-wider rounded">
                        Price: {SESSION_PRICE}
                     </div>
                )}
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
            <div className="space-y-2">
                <label className="text-xs text-muted uppercase tracking-widest font-bold">Full Name</label>
                <input 
                    type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[var(--background)] border border-glass rounded-xl p-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Enter your name"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-muted uppercase tracking-widest font-bold">Email Address</label>
                <input 
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--background)] border border-glass rounded-xl p-4 text-theme focus:outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Enter your email"
                />
            </div>
            <button 
                type="submit" disabled={isSubmitting}
                className="w-full bg-[var(--foreground)] text-[var(--background)] font-serif tracking-widest text-sm py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-auto disabled:opacity-50"
            >
                {isSubmitting ? 'PROCESSING...' : (isPaid ? 'PROCEED TO PAYMENT' : 'CONFIRM BOOKING')}
            </button>
        </form>
    </div>
  )};

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10">
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
    <div 
        className="h-full flex flex-col overflow-hidden overscroll-contain"
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
                className="flex-1 h-full"
            >
                {view === 'calendar' && renderCalendar()}
                {view === 'slots' && renderSlots()}
                {view === 'form' && renderForm()}
                {view === 'success' && renderSuccess()}
            </motion.div>
        </AnimatePresence>
    </div>
  );
}