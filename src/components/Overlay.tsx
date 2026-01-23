'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowDown, X } from 'lucide-react';
import Carousel from './Carousel';
import BookingCalendar from './BookingCalendar';
import { LANDING_CONTENT } from '@/lib/data';

export default function Overlay() {
  const [introFinished, setIntroFinished] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Intro Animation Sequence
  useEffect(() => {
    // Skip intro in development for faster iteration
    if (process.env.NODE_ENV === 'development') {
      setIntroFinished(true);
      return;
    }
    const timer = setTimeout(() => {
      setIntroFinished(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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

      {/* Booking Modal (Full Screen Redesign) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-gold hover:text-black rounded-full text-white transition-all z-20 border border-white/10"
              >
                <X size={20} />
              </button>
              
              <div className="w-full h-full max-w-4xl mx-auto p-6 md:p-10">
                  <BookingCalendar onClose={() => setIsModalOpen(false)} />
              </div>
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
        {/* Header (Minimal) */}
        <header className="fixed top-0 w-full p-8 flex justify-between items-center z-40">
            <div className="flex items-center gap-4 group cursor-default">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 opacity-70" />
            </div>
            <nav className="hidden md:flex gap-8 text-xs font-serif tracking-[0.15em] uppercase text-white/50">
                <a href="#method" className="hover:text-gold transition-colors">Method</a>
                <a href="#about" className="hover:text-gold transition-colors">About</a>
            </nav>
        </header>

        <main className="max-w-4xl mx-auto px-6">
            
            {/* Hero Section */}
            <section className="h-screen flex flex-col justify-center text-center items-center space-y-10 relative -mt-16">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                >
                    <h1 className="font-serif text-5xl md:text-7xl font-medium leading-tight text-white drop-shadow-2xl">
                        When Your Head is Full <br />
                        <span className="text-gold italic">and You Need a Space to Think.</span>
                    </h1>
                </motion.div>

                <motion.div
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 1, duration: 0.8 }}
                >
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="font-serif tracking-widest text-sm py-4 px-10 rounded-full border border-gold/40 text-gold hover:bg-gold/10 hover:scale-105 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(224,184,115,0.1)]"
                    >
                        BOOK AN INTRODUCTORY CALL
                    </button>
                </motion.div>
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20 text-gold">
                    <ArrowDown size={24} />
                </div>
            </section>

            {/* Carousel Section */}
            <section className="h-screen w-screen -translate-x-1/2 left-1/2 relative flex items-center justify-center">
                <Carousel />
            </section>

            {/* Full-Screen Typography Sections */}
            {LANDING_CONTENT.map((section) => (
                <section key={section.id} id={section.id} className="h-screen flex flex-col justify-center items-center text-center">
                    <motion.div
                        className="p-10 md:p-16 max-w-4xl"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 1 }}
                    >
                        <h2 className="font-serif text-4xl md:text-6xl text-gold mb-12 leading-snug">{section.title}</h2>
                        <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">{section.content}</p>
                    </motion.div>
                </section>
            ))}

        </main>

        <footer className="text-center py-12 text-white/20 text-xs font-serif tracking-widest uppercase">
            &copy; 2026 HIDDEN DEPTHS.
        </footer>
      </motion.div>
    </>
  );
}
