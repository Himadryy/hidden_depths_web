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
    const timer = setTimeout(() => {
      setIntroFinished(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Back Button Support
  useEffect(() => {
    const handlePopState = () => {
      setIsModalOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openModal = useCallback(() => {
    if (!user) {
        setIsAuthModalOpen(true);
        return;
    }
    setIsModalOpen(true);
    window.history.pushState({ modal: true }, '', '#booking');
  }, [user]);

  const closeModal = useCallback(() => {
    if (window.location.hash === '#booking') {
        window.history.back();
    } else {
        setIsModalOpen(false);
    }
  }, []);

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      
      {/* Intro Overlay - Bloom Style */}
      <AnimatePresence>
        {!introFinished && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [1, 1.1, 80], opacity: [1, 1, 0] }}
              transition={{ duration: 2.5, times: [0, 0.5, 1], ease: [0.16, 1, 0.3, 1] }}
              className="relative w-32 h-32"
            >
                <Image
                  src="/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain opacity-80"
                  priority
                />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal (Bloom Glass) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 h-[100dvh] z-[60] bg-glass backdrop-blur-3xl overscroll-none"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
              <button
                onClick={closeModal}
                className="absolute top-8 right-8 p-3 bg-white/50 hover:bg-[var(--accent)] hover:text-white rounded-full text-[var(--foreground)] transition-all z-20 border border-glass shadow-sm"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
              
              <div className="w-full h-full max-w-5xl mx-auto p-6 md:p-12 overflow-y-auto">
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
        transition={{ duration: 2, delay: 0.5 }}
      >
        {/* Header */}
        <header className="fixed top-0 w-full px-8 md:px-16 pt-8 md:pt-12 flex justify-between items-center z-40 pointer-events-auto">
            <div className="flex items-center gap-4 group cursor-default">
                <div className="relative w-12 h-12 opacity-60 hover:opacity-100 transition-all duration-700">
                    <Image 
                        src="/logo.png" 
                        alt="Logo" 
                        fill
                        priority
                        className="object-contain" 
                    />
                </div>
            </div>
            <UserMenu />
        </header>

        <main className="max-w-6xl mx-auto px-6">
            
            {/* Hero Section - The Bloom Sanctuary */}
            <section className="h-screen flex flex-col justify-center text-center items-center space-y-16 relative">
                <motion.div
                    initial={{ opacity: 0, y: 50, filter: 'blur(15px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 1.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-5xl"
                >
                    <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-semibold leading-[1.05] text-[var(--accent-deep)] tracking-tight">
                        When your head is full, <br />
                        <span className="text-[var(--accent)] italic font-light tracking-normal opacity-80">you need a space to think.</span>
                    </h1>
                </motion.div>

                <motion.div
                     initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                     animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                     transition={{ duration: 1.5, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <button 
                        onClick={openModal}
                        className="btn-bloom uppercase tracking-[0.25em] text-[10px] sm:text-xs"
                    >
                        BOOK AN INTRODUCTORY SESSION
                    </button>
                    <p className="mt-6 text-[var(--text-muted)] font-sans text-[10px] tracking-widest uppercase opacity-70">
                        Private &bull; Anonymous &bull; Supportive
                    </p>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.5, duration: 1.5 }}
                    className="absolute bottom-16 left-1/2 -translate-x-1/2 opacity-30 hover:opacity-100 transition-opacity text-[var(--accent-deep)]"
                >
                    <motion.div
                        animate={{ y: [0, 12, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    >
                        <ArrowDown size={28} strokeWidth={1} />
                    </motion.div>
                </motion.div>
            </section>

            {/* Carousel Section */}
            <section id="insights" className="h-screen w-screen -translate-x-1/2 left-1/2 relative flex items-center justify-center">
                <Carousel />
            </section>

            {/* Content Sections - Breathable Layout */}
            {LANDING_CONTENT.map((section, idx) => (
                <section key={section.id} id={section.id} className="min-h-screen flex flex-col justify-center items-center text-center py-32 md:py-48">
                    <motion.div
                        className="card-bloom max-w-4xl"
                        initial={{ opacity: 0, y: 80, filter: 'blur(15px)' }}
                        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        viewport={{ once: true, margin: "-150px" }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="text-[var(--accent)] text-xs font-sans tracking-[0.3em] uppercase opacity-60 mb-6 block">
                            Chapter 0{idx + 1}
                        </span>
                        <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl text-[var(--accent-deep)] mb-10 leading-tight tracking-tight">
                            {section.title}
                        </h2>
                        <div className="h-[1px] w-24 bg-[var(--accent)]/20 mx-auto mb-12" />
                        <p className="text-xl md:text-3xl leading-[1.8] text-[var(--foreground)] font-light opacity-90 max-w-2xl mx-auto">
                            {section.content}
                        </p>
                    </motion.div>
                </section>
            ))}

        </main>

        <footer className="text-center py-20 pb-safe text-[var(--text-muted)] text-[10px] font-sans tracking-[0.4em] uppercase opacity-50">
            &copy; 2026 HIDDEN DEPTHS &bull; A DIGITAL SANCTUARY
        </footer>
      </motion.div>
    </>
  );
}

