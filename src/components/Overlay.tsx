'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowDown, X } from 'lucide-react';
import Carousel from './Carousel';
import BookingCalendar from './BookingCalendar';
import { LANDING_CONTENT } from '@/lib/data';
import { usePerformance } from '@/hooks/usePerformance';

export default function Overlay() {
  const [introFinished, setIntroFinished] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { tier } = usePerformance();

  // Intro Animation Sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroFinished(true);
    }, 2500); // Intro lasts 2.5s
    return () => clearTimeout(timer);
  }, []);

  // Performance-aware Glass Styles
  const glassPanel = tier === 'LOW' 
    ? 'bg-black/90 border border-white/10' 
    : 'bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl';

  return (
    <>
      {/* Intro Overlay - Zoom Burst */}
      <AnimatePresence>
        {!introFinished && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
          >
            <motion.img
              src="/logo.png"
              alt="Logo"
              className="w-32 h-32"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.5, 50], opacity: [1, 1, 0] }}
              transition={{ duration: 2.2, times: [0, 0.4, 1], ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal (Glass Redesign) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
          >
            {/* Modal Backdrop */}
            <div className={`absolute inset-0 ${tier === 'LOW' ? 'bg-black/90' : 'bg-black/60 backdrop-blur-sm'}`} />

            <motion.div
              className={`w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden relative z-10 ${glassPanel}`}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-gold hover:text-black rounded-full text-white transition-all z-20 border border-white/10"
              >
                <X size={20} />
              </button>
              
              {/* Custom Booking System */}
              <div className="w-full h-full p-6 md:p-10 overflow-hidden">
                  <BookingCalendar onClose={() => setIsModalOpen(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        className={`relative z-10 w-full min-h-screen text-white ${introFinished ? 'pointer-events-auto' : 'pointer-events-none'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: introFinished ? 1 : 0 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      >
        {/* Header (Glass) */}
        <header className={`fixed top-0 w-full p-6 flex justify-between items-center z-40 transition-all duration-500 ${tier === 'LOW' ? 'bg-black/80' : 'backdrop-blur-md bg-gradient-to-b from-black/50 to-transparent'}`}>
            <div className="flex items-center gap-4 group cursor-default">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 opacity-80 group-hover:opacity-100 transition-opacity" />
                <span className="font-serif font-bold text-lg tracking-[0.2em] text-gold uppercase">Hidden Depths</span>
            </div>
            <nav className="hidden md:flex gap-8 text-xs font-serif tracking-[0.15em] uppercase text-white/70">
                <a href="#method" className="hover:text-gold transition-colors relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-gold hover:after:w-full after:transition-all">Method</a>
                <a href="#about" className="hover:text-gold transition-colors relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-gold hover:after:w-full after:transition-all">About</a>
            </nav>
        </header>

        <main className="max-w-5xl mx-auto px-6 pt-32 pb-20 space-y-40">
            
            {/* Hero Section */}
            <section className="min-h-[85vh] flex flex-col justify-center text-center space-y-10 relative">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    <h1 className="font-serif text-5xl md:text-7xl font-medium leading-tight text-white drop-shadow-2xl">
                        When Your Head is Full <br />
                        <span className="text-gold italic">and You Need a Space to Think.</span>
                    </h1>
                </motion.div>

                <motion.p 
                    className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed font-light tracking-wide"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 1 }}
                >
                    Welcome to a new kind of confidential conversation. <br/>
                    Not therapy. Just clarity.
                </motion.p>

                <motion.div
                     initial={{ opacity: 0, scale: 0.95 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     viewport={{ once: true }}
                     transition={{ delay: 0.6, duration: 0.8 }}
                >
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-3 bg-white/5 hover:bg-gold/10 border border-gold/30 text-gold font-serif tracking-widest text-sm py-4 px-10 rounded-full hover:scale-105 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(224,184,115,0.2)] cursor-pointer backdrop-blur-sm"
                    >
                        <Calendar size={16} />
                        BOOK A FREE INTRODUCTORY CALL
                    </button>
                </motion.div>
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-30 text-gold">
                    <ArrowDown size={24} />
                </div>
            </section>

            {/* Interactive Carousel Section */}
            <section className="min-h-screen flex items-center justify-center">
                <div className="w-full relative">
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 text-center space-y-2 mb-10">
                        <span className="text-gold/50 text-xs font-serif tracking-[0.3em] uppercase">Reflections</span>
                    </div>
                    <Carousel />
                </div>
            </section>

            {/* Content Sections (Decoupled) */}
            {LANDING_CONTENT.map((section) => (
                <section key={section.id} id={section.id} className="min-h-screen flex flex-col justify-center items-center relative">
                     {/* Decorative Line */}
                    <div className="absolute top-0 w-px h-24 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
                    
                    <motion.div
                        className={`p-10 md:p-16 text-center max-w-4xl rounded-3xl ${glassPanel}`}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="font-serif text-3xl md:text-5xl text-gold mb-8 leading-snug">{section.title}</h2>
                        <p className="text-lg md:text-xl leading-relaxed text-white/80 font-light">{section.content}</p>
                    </motion.div>
                </section>
            ))}

        </main>

        <footer className="text-center py-12 text-white/30 text-xs font-serif tracking-widest uppercase border-t border-white/5 bg-black/40 backdrop-blur-sm">
            &copy; 2025 Hidden Depths. All Rights Reserved.
        </footer>
      </motion.div>
    </>
  );
}