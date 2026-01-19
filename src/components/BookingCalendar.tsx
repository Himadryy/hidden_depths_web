'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, CheckCircle, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import emailjs from '@emailjs/browser';

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
    } catch (error) {
        setIsSubmitting(false);
        // Error is handled in saveBooking
    }
  };

  // Render Functions
  const renderCalendar = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 mb-6">
            <h3 className="text-xl font-display font-bold text-white">Select a Date</h3>
            <p className="text-sm text-gray-400">Sessions are available on Sundays & Mondays.</p>
        </div>
        
        {/* Rolling List of Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {availableDates.map((date, i) => (
                <button
                    key={i}
                    onClick={() => handleDateClick(date)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-[#E0B873] hover:text-black hover:border-[#E0B873] transition-all group"
                >
                    <div>
                        <span className="block font-bold text-lg">{date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        <span className="text-sm opacity-60 group-hover:opacity-100">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                    </div>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
            ))}
        </div>
      </div>
    );
  };

  const renderSlots = () => (
    <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('calendar')} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={24} />
            </button>
            <div>
                <h3 className="text-xl font-display font-bold text-white">Select a Time</h3>
                <p className="text-xs text-[#E0B873]">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {TIME_SLOTS.map((time) => (
                <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-[#E0B873] hover:text-black hover:border-[#E0B873] transition-all flex items-center justify-center gap-2 group"
                >
                    <Clock size={16} className="text-[#E0B873] group-hover:text-black transition-colors" />
                    {time}
                </button>
            ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">Sessions are 30 minutes long.</p>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('slots')} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={24} />
            </button>
            <h3 className="text-xl font-display font-bold text-white">Finalize Booking</h3>
        </div>
        
        <div className="bg-[#E0B873]/10 p-4 rounded-xl border border-[#E0B873]/20 mb-6 flex items-start gap-4">
            <CalendarIcon className="text-[#E0B873] mt-1" size={20} />
            <div>
                <p className="text-white font-bold text-lg">Introductory Session (30m)</p>
                <p className="text-gray-300">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-[#E0B873]">{selectedTime}</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm text-gray-400">Full Name</label>
                <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#E0B873] transition-colors"
                    placeholder="John Doe"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm text-gray-400">Email Address</label>
                <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#E0B873] transition-colors"
                    placeholder="john@example.com"
                />
            </div>
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-[#E0B873] text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#E0B873]/20 mt-4 flex items-center justify-center gap-2 cursor-pointer"
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                    'Confirm Booking'
                )}
            </button>
        </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-10">
        <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            className="w-20 h-20 bg-[#E0B873] rounded-full flex items-center justify-center text-black mb-4"
        >
            <CheckCircle size={40} />
        </motion.div>
        <h3 className="text-3xl font-display font-bold text-white">Booking Confirmed!</h3>
        <p className="text-gray-400 max-w-md">
            Your 30-minute session on <span className="text-[#E0B873]">{selectedDate?.toLocaleDateString()}</span> at <span className="text-[#E0B873]">{selectedTime}</span> has been requested. We will email <span className="text-white">{email}</span> shortly.
        </p>
        <button 
            onClick={onClose}
            className="mt-8 px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 text-white transition-colors cursor-pointer"
        >
            Close
        </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode='wait'>
            <motion.div
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
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
