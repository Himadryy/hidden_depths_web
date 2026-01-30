'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, X } from 'lucide-react';
import Image from 'next/image';
import Carousel from './Carousel';
import BookingCalendar from './BookingCalendar';
import { LANDING_CONTENT } from '@/lib/data';

import UserMenu from './UserMenu';

export default function Overlay() {
  const [introFinished, setIntroFinished] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Intro Animation Sequence
  useEffect(() => {
    // In development, we can speed this up, but let's keep it consistent for now to pass linting
    const timer = setTimeout(() => {
      setIntroFinished(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Back Button / History Support for Modal
  useEffect(() => {
    const handlePopState = () => {
      // If user presses "Back" and the modal is open, this event fires.
      // The URL hash will likely be gone now, so we just close the modal.
      setIsModalOpen(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    // Push "fake" history state so the Back button has something to "undo"
    window.history.pushState({ modal: true }, '', '#booking');
  }, []);

  const closeModal = useCallback(() => {
    // If the URL has the hash, we go back (which triggers popstate -> closes modal)
    // This keeps history clean.
    if (window.location.hash === '#booking') {
        window.history.back();
    } else {
        // Fallback if hash is missing for some reason
        setIsModalOpen(false);
    }
  }, []);

  return (
    <>
      {/* Intro Overlay - Adaptive */}
      <AnimatePresence>
        {!introFinished && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.2, 50], opacity: [1, 1, 0] }}
              transition={{ duration: 2.2, times: [0, 0.4, 1], ease: "easeInOut" }}
              className="relative w-32 h-32"
            >
                <Image
                src="/logo.png"
                alt="Logo"
                fill
                className="object-contain invert dark:invert-0"
                priority
                />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal (Adaptive Glass) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 h-[100dvh] z-[60] bg-glass backdrop-blur-2xl overscroll-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
              <button
                onClick={closeModal}
                className="absolute top-6 right-6 p-2 bg-[var(--background)] hover:bg-[var(--accent)] hover:text-[var(--background)] rounded-full text-[var(--foreground)] transition-all z-20 border border-glass"
              >
                <X size={20} />
              </button>
              
              <div className="w-full h-full max-w-4xl mx-auto p-6 md:p-10">
                  <BookingCalendar onClose={closeModal} />
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        className={`relative z-10 w-full min-h-screen text-theme ${introFinished ? 'pointer-events-auto' : 'pointer-events-none'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: introFinished ? 1 : 0 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      >
        {/* Header (Minimal) */}
        <header className="fixed top-0 w-full p-8 flex justify-between items-center z-40 pointer-events-auto">
            <div className="flex items-center gap-4 group cursor-default">
                <div className="relative w-10 h-10 opacity-80 hover:opacity-100 transition-all">
                    <Image 
                        src="/logo.png" 
                        alt="Logo" 
                        fill
                        className="object-contain invert dark:invert-0" 
                    />
                </div>
            </div>
            <UserMenu />
        </header>

        <main className="max-w-4xl mx-auto px-6">
            
            {/* Hero Section */}
            <section className="h-screen flex flex-col justify-center text-center items-center space-y-10 relative -mt-16">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                >
                    <h1 className="font-serif text-5xl md:text-7xl font-medium leading-tight text-theme">
                        When Your Head is Full <br />
                        <span className="text-[var(--accent)] italic">and You Need a Space to Think.</span>
                    </h1>
                </motion.div>

                <motion.div
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 1, duration: 0.8 }}
                >
                    <button 
                        onClick={openModal}
                        className="font-serif tracking-widest text-sm py-4 px-10 rounded-full border border-glass text-muted hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all duration-500 shadow-sm"
                    >
                        BOOK AN INTRODUCTORY CALL
                    </button>
                </motion.div>
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20 text-theme">
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
                        <h2 className="font-serif text-4xl md:text-6xl text-[var(--accent)] mb-12 leading-snug">{section.title}</h2>
                        <p className="text-xl md:text-2xl leading-relaxed text-muted font-light">{section.content}</p>
                    </motion.div>
                </section>
            ))}

        </main>

        <footer className="text-center py-12 text-muted text-xs font-serif tracking-widest uppercase opacity-60">
            &copy; 2026 HIDDEN DEPTHS.
        </footer>
      </motion.div>
    </>
  );
}
