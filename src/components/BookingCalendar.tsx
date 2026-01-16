'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import emailjs from '@emailjs/browser';

type ViewState = 'calendar' | 'slots' | 'form' | 'success';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function BookingCalendar({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<ViewState>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
    setView('slots');
  };

  // Mock Time Slots
  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', 
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
  ];

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
        };

        // EmailJS Integration
        await emailjs.send(
            'service_sez2cbc', // Service ID
            'template_znieakk', // Template ID
            templateParams,
            'igQZndS9gfVVllNJm' // Public Key
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
    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-[#E0B873]" />
            </button>
            <h3 className="text-xl font-display font-bold text-white">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight size={20} className="text-[#E0B873]" />
            </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2 text-gray-400">
            {DAYS.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
            {blanks.map((_, i) => <div key={`blank-${i}`} />)}
            {days.map(day => (
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`
                        h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                        ${selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth() 
                            ? 'bg-[#E0B873] text-black shadow-lg scale-110' 
                            : 'bg-white/5 text-white hover:bg-white/20 hover:scale-105'}
                    `}
                >
                    {day}
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
            <h3 className="text-xl font-display font-bold text-white">Select a Time</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {timeSlots.map((time) => (
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
        <p className="text-center text-gray-500 text-sm mt-4">All times are in your local timezone.</p>
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
                <p className="text-white font-bold text-lg">Introductory Session</p>
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
                className="w-full bg-[#E0B873] text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#E0B873]/20 mt-4 flex items-center justify-center gap-2"
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
            Your request for <span className="text-[#E0B873]">{selectedDate?.toLocaleDateString()}</span> at <span className="text-[#E0B873]">{selectedTime}</span> has been received. We will send a confirmation email to <span className="text-white">{email}</span> shortly.
        </p>
        <button 
            onClick={onClose}
            className="mt-8 px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 text-white transition-colors"
        >
            Close
        </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
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
