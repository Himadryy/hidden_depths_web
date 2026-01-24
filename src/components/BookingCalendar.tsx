'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, CheckCircle, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { sendBookingEmail } from '@/lib/email';

type ViewState = 'calendar' | 'slots' | 'form' | 'success';

const TIME_SLOTS = [
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
];

export default function BookingCalendar({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<ViewState>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cycleOffset, setCycleOffset] = useState(0);

  // Logic: Get next available Sundays and Mondays (2 weeks per cycle)
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    // Start from today + offset, look ahead 14 days
    const startDayOffset = cycleOffset * 14;
    
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + startDayOffset + i);
        const day = d.getDay();
        
        // 0 = Sunday, 1 = Monday
        if (day === 0 || day === 1) {
            dates.push(d);
        }
    }
    return dates;
  }, [cycleOffset]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('slots');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        await sendBookingEmail({
            name,
            email,
            date: selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || 'Unknown Date',
            time: selectedTime || 'Unknown Time',
            duration: "30 Minutes",
        });
        
        console.log("Booking success!");
        setIsSubmitting(false);
        setView('success');
    } catch (error) {
        console.error("Booking Error:", error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (error as any)?.message || "Something went wrong. Please check your network or try again later.";
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
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-3 rounded-lg text-center">
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
            {availableDates.map((date, i) => (
                <button
                    key={i}
                    onClick={() => handleDateClick(date)}
                    className={`${buttonStyle} ${passiveButtonStyle}`}
                >
                    <div className="z-10">
                        <span className="block text-lg md:text-xl">{date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        <span className="text-sm opacity-40 font-sans tracking-wide">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                    </div>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-[var(--accent)] z-10" />
                </button>
            ))}
        </div>

        {/* Cycle Controls */}
        <div className="flex justify-between mt-auto pt-4 border-t border-glass">
            <button 
                onClick={() => setCycleOffset(Math.max(0, cycleOffset - 1))}
                disabled={cycleOffset === 0}
                className="text-xs font-bold uppercase tracking-widest text-muted hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                ← Previous Weeks
            </button>
            <button 
                onClick={() => setCycleOffset(cycleOffset + 1)}
                className="text-xs font-bold uppercase tracking-widest text-muted hover:text-[var(--accent)] transition-colors"
            >
                Next Weeks →
            </button>
        </div>
    </div>
  );

  const renderSlots = () => (
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
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
            {TIME_SLOTS.map((time) => (
                <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="py-4 px-4 rounded-xl bg-[var(--background)] border border-glass text-muted hover:bg-[var(--accent)]/10 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center justify-center gap-2 group font-sans text-sm tracking-wide shadow-sm"
                >
                    <Clock size={14} className="text-[var(--accent)]" />
                    {time}
                </button>
            ))}
        </div>
    </div>
  );

  const renderForm = () => (
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
                {isSubmitting ? 'CONFIRMING...' : 'CONFIRM BOOKING'}
            </button>
        </form>
    </div>
  );

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
        className="h-full flex flex-col overflow-hidden"
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
