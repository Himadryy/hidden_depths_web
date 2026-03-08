'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, X } from 'lucide-react';
import Image from 'next/image';
import Carousel from './Carousel';
import BookingCalendar from './BookingCalendar';
import { LANDING_CONTENT } from '@/lib/data';

import UserMenu from './UserMenu';
import { useAuth } from '@/context/AuthProvider';
import AuthModal from './AuthModal';

export default function Overlay() {
  const { user } = useAuth();
  const [introFinished, setIntroFinished] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
    if (!user) {
        setIsAuthModalOpen(true);
        return;
    }
    setIsModalOpen(true);
    // Push "fake" history state so the Back button has something to "undo"
    window.history.pushState({ modal: true }, '', '#booking');
  }, [user]);

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
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
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
        <header className="fixed top-0 w-full px-safe pt-safe flex justify-between items-center z-40 pointer-events-auto">
            <div className="flex items-center gap-4 group cursor-default">
                <div className="relative w-10 h-10 opacity-80 hover:opacity-100 transition-all">
                    <Image 
                        src="/logo.png" 
                        alt="Logo" 
                        fill
                        priority
                        className="object-contain invert dark:invert-0" 
                    />
                </div>
            </div>
            <UserMenu />
        </header>

        <main className="max-w-4xl mx-auto px-6">
            
            {/* Hero Section */}
            <section className="h-screen flex flex-col justify-center text-center items-center space-y-12 relative -mt-16">
                <motion.div
                    initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 1.4, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium leading-[1.1] text-theme tracking-tight">
                        When your head is full, <br />
                        <span className="text-[var(--accent)] italic font-light tracking-normal">you need a space to think.</span>
                    </h1>
                </motion.div>

                <motion.div
                     initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                     animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                     transition={{ duration: 1.2, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <button 
                        onClick={openModal}
                        className="group relative overflow-hidden font-sans tracking-[0.2em] text-xs font-semibold py-5 px-12 rounded-full border border-glass text-theme transition-all duration-700 hover:border-[var(--accent)] hover:shadow-[0_0_40px_-10px_var(--accent)] bg-glass hover:bg-transparent"
                    >
                        <span className="relative z-10 transition-colors duration-500 group-hover:text-[var(--accent)]">BOOK AN INTRODUCTORY CALL</span>
                        <div className="absolute inset-0 h-full w-full scale-0 rounded-full transition-all duration-500 group-hover:scale-100 group-hover:bg-[var(--accent)]/5" />
                    </button>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-40 hover:opacity-100 transition-opacity text-theme"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                        <ArrowDown size={20} strokeWidth={1.5} />
                    </motion.div>
                </motion.div>
            </section>

            {/* Carousel Section */}
            <section className="h-screen w-screen -translate-x-1/2 left-1/2 relative flex items-center justify-center">
                <Carousel />
            </section>

            {/* Full-Screen Typography Sections */}
            {LANDING_CONTENT.map((section) => (
                <section key={section.id} id={section.id} className="min-h-screen flex flex-col justify-center items-center text-center py-20">
                    <motion.div
                        className="p-8 md:p-16 max-w-3xl"
                        initial={{ opacity: 0, y: 60, filter: 'blur(10px)' }}
                        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl text-[var(--accent)] mb-8 leading-tight tracking-tight">
                            {section.title}
                        </h2>
                        <div className="h-px w-16 bg-[var(--accent)]/30 mx-auto mb-10" />
                        <p className="text-lg md:text-2xl leading-relaxed text-theme font-light opacity-90">
                            {section.content}
                        </p>
                    </motion.div>
                </section>
            ))}

        </main>

        <footer className="text-center py-12 pb-safe text-muted text-xs font-serif tracking-widest uppercase opacity-60">
            &copy; 2026 HIDDEN DEPTHS.
        </footer>
      </motion.div>
    </>
  );
}
