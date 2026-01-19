'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowDown, X } from 'lucide-react';
import Carousel from './Carousel';
import BookingCalendar from './BookingCalendar';

const sections = [
  {
    id: 'method',
    title: "Our Unique 'Focused Anonymity' Method",
    content: "Traditional video calls can be distracting. We've designed a unique experience to remove that anxiety and help you focus entirely on your conversation. When our session begins, I remain off-camera. Instead, your screen will display a peaceful, meditative visual to act as a calming anchor for your thoughts. Your camera is your choice, always. Your comfort is the priority."
  },
  {
    id: 'about',
    title: "Your Guide on the Side",
    content: "I am not a licensed therapist or a psychologist. I am a mentor and a guide, trained in the art of listening. My belief is that you already hold the answers you're looking for. My role is to walk beside you, listen without judgment, and ask thoughtful questions that help you see your own path more clearly. This is a partnership built on trust, respect, and our shared goal of finding your clarity."
  }
];

export default function Overlay() {
  const [introFinished, setIntroFinished] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Intro Animation Sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroFinished(true);
    }, 2500); // Intro lasts 2.5s
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

      {/* Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              className="bg-[#1a1a1a] w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden relative shadow-2xl border border-[#E0B873]/30"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-[#E0B873] hover:text-black rounded-full text-white transition-colors z-10"
              >
                <X size={24} />
              </button>
              
              {/* Custom Booking System */}
              <div className="w-full h-full bg-[#1a1a1a] p-4 md:p-8">
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
        {/* Header */}
        <header className="fixed top-0 w-full p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm z-40">
            <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Logo" className="h-10 w-10" />
                <span className="font-display font-semibold text-lg tracking-widest text-[#E0B873]">HiDden DeptHs</span>
            </div>
            <nav className="hidden md:flex gap-8 text-sm uppercase tracking-wide">
                <a href="#method" className="hover:text-[#E0B873] transition-colors">The Method</a>
                <a href="#about" className="hover:text-[#E0B873] transition-colors">About</a>
            </nav>
        </header>

        <main className="max-w-4xl mx-auto px-6 pt-32 pb-20 space-y-40">
            
            {/* Hero Section */}
            <section className="min-h-[80vh] flex flex-col justify-center text-center space-y-8">
                <motion.h1 
                    className="font-display text-4xl md:text-6xl font-bold leading-tight text-[#E0B873] drop-shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    When Your Head is Full and You Need a Space to Think.
                </motion.h1>
                <motion.p 
                    className="text-lg md:text-xl text-white max-w-2xl mx-auto leading-relaxed"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                >
                    Welcome to a new kind of confidential conversation, designed for clarity. This is not therapy; this is guided thinking.
                </motion.p>
                <motion.div
                     initial={{ opacity: 0, scale: 0.9 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     viewport={{ once: true }}
                     transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-3 bg-[#E0B873] text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(224,184,115,0.4)] cursor-pointer"
                    >
                        <Calendar size={18} />
                        Book a Free Introductory Call
                    </button>
                </motion.div>
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                    <ArrowDown size={24} />
                </div>
            </section>

            {/* Interactive Carousel Section */}
            <section className="min-h-screen flex items-center">
                <Carousel />
            </section>

            {/* Content Sections */}
            {sections.map((section) => (
                <section key={section.id} id={section.id} className="min-h-screen flex flex-col justify-center items-center">
                    <motion.div
                        className="p-8 md:p-12 text-center max-w-3xl"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="font-display text-3xl md:text-5xl text-[#E0B873] mb-8 drop-shadow-md">{section.title}</h2>
                        <p className="text-lg md:text-xl leading-relaxed text-white/90">{section.content}</p>
                    </motion.div>
                </section>
            ))}

        </main>

        <footer className="text-center py-8 text-gray-500 text-sm">
            &copy; 2025 Hidden Depths. All Rights Reserved.
        </footer>
      </motion.div>
    </>
  );
}
