'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, CheckCircle, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { usePerformance } from '@/hooks/usePerformance';

type ViewState = 'calendar' | 'slots' | 'form' | 'success';

// Time Slots: 12:00 PM to 6:00 PM (Last slot 5:30 PM for 30 min duration)
const TIME_SLOTS = [
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
];

export default function BookingCalendar({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<ViewState>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { tier } = usePerformance();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logic: Get next available Sundays and Mondays
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    // Start from today, look ahead 8 weeks (approx 60 days)
    for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const day = d.getDay();
        
        // 0 = Sunday, 1 = Monday
        if (day === 0 || day === 1) {
            dates.push(d);
        }
    }
    return dates;
  }, []);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('slots');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setView('form');
  };

  const saveBooking = async (bookingData: { date: Date | null, time: string | null, name: string, email: string }) => {
    try {
        const templateParams = {
            name: bookingData.name,
            email: bookingData.email,
            date: bookingData.date?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            time: bookingData.time,
            duration: "30 Minutes", // Explicitly mention duration
        };

        // EmailJS Integration
        await emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!, // Service ID
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!, // Template ID
            templateParams,
            process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY! // Public Key
        );
        
        console.log("Booking email sent successfully!");
    } catch (error) {
        console.error("Failed to send booking email:", error);
        alert("Something went wrong. Please try again later.");
        throw error; // Re-throw to prevent success screen
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        await saveBooking({
            date: selectedDate,
            time: selectedTime,
            name,
            email
        });
        setIsSubmitting(false);
        setView('success');
    } catch {
        setIsSubmitting(false);
        // Error is handled in saveBooking
    }
  };

  // Styles
  const buttonStyle = "flex items-center justify-between p-4 rounded-xl text-left transition-all group relative overflow-hidden";
  const activeButtonStyle = "bg-gold text-black border border-gold shadow-[0_0_15px_rgba(224,184,115,0.4)]";
  const passiveButtonStyle = "bg-black border border-white/10 hover:bg-gold hover:text-black hover:border-gold text-white";

  // Render Functions
  const renderCalendar = () => {
    return (
      <div className="space-y-8 h-full flex flex-col">
        <div className="flex flex-col gap-2">
            <h3 className="text-3xl font-serif text-white">Select a Date</h3>
            <div className="h-px w-12 bg-gold/50" />
            <p className="text-sm text-white/50 font-light tracking-wide mt-2">Sessions available on Sundays & Mondays.</p>
        </div>
        
        {/* Rolling List of Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar pb-10">
            {availableDates.map((date, i) => (
                <button
                    key={i}
                    onClick={() => handleDateClick(date)}
                    className={`${buttonStyle} ${passiveButtonStyle}`}
                >
                    <div className="z-10">
                        <span className="block font-serif text-xl">{date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        <span className="text-sm opacity-60 font-sans tracking-wide">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                    </div>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-black z-10" />
                </button>
            ))}
        </div>
      </div>
    );
  };

  const renderSlots = () => (
    <div className="space-y-8 h-full flex flex-col">
        <div className="flex items-center gap-4">
            <button onClick={() => setView('calendar')} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors">
                <ChevronLeft size={24} />
            </button>
            <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-serif text-white">Select a Time</h3>
                <p className="text-xs font-sans text-gold tracking-widest uppercase">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
            {TIME_SLOTS.map((time) => (
                <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="py-4 px-4 rounded-xl bg-black border border-white/10 text-white/80 hover:bg-gold hover:text-black hover:border-gold transition-all flex items-center justify-center gap-2 group font-sans text-sm tracking-wide"
                >
                    <Clock size={14} className="text-gold group-hover:text-black transition-colors" />
                    {time}
                </button>
            ))}
        </div>
        <p className="text-center text-white/30 text-xs tracking-widest uppercase">All times are in your local timezone</p>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-8 h-full flex flex-col">
        <div className="flex items-center gap-4">
            <button onClick={() => setView('slots')} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors">
                <ChevronLeft size={24} />
            </button>
            <h3 className="text-2xl font-serif text-white">Finalize Booking</h3>
        </div>
        
        <div className="bg-gradient-to-br from-gold/20 to-transparent p-6 rounded-2xl border border-gold/20 flex items-start gap-5">
            <div className="p-3 bg-gold/10 rounded-full text-gold">
                <CalendarIcon size={20} />
            </div>
            <div>
                <p className="text-white font-serif text-xl mb-1">Introductory Session</p>
                <p className="text-white/60 text-sm font-sans mb-2">30 Minutes • Video Call</p>
                <div className="flex flex-col text-gold text-sm font-medium tracking-wide">
                    <span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    <span>{selectedTime}</span>
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
            <div className="space-y-2">
                <label className="text-xs text-gold uppercase tracking-widest font-bold">Full Name</label>
                <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold focus:bg-white/10 transition-all"
                    placeholder="Enter your name"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-gold uppercase tracking-widest font-bold">Email Address</label>
                <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold focus:bg-white/10 transition-all"
                    placeholder="Enter your email"
                />
            </div>
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gold text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gold/20 mt-auto flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                    'CONFIRM BOOKING'
                )}
            </button>
        </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10">
        <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            className="w-24 h-24 bg-gold rounded-full flex items-center justify-center text-black mb-4 shadow-[0_0_40px_rgba(224,184,115,0.4)]"
        >
            <CheckCircle size={48} />
        </motion.div>
        <div className="space-y-4">
            <h3 className="text-4xl font-serif text-white">Booking Confirmed</h3>
            <p className="text-white/60 max-w-md mx-auto leading-relaxed">
                Your sanctuary time is reserved for <br />
                <span className="text-gold font-bold">{selectedDate?.toLocaleDateString()}</span> at <span className="text-gold font-bold">{selectedTime}</span>.
            </p>
            <p className="text-sm text-white/40">A confirmation has been sent to {email}</p>
        </div>
        <button 
            onClick={onClose}
            className="mt-12 px-10 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer tracking-widest text-xs uppercase hover:border-white/30"
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
                transition={{ duration: 0.4, ease: "circOut" }}
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