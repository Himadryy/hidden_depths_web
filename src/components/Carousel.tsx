'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePerformance } from '@/hooks/usePerformance';
import { useDrag } from '@use-gesture/react';
import { fetchInsights } from '@/lib/data';
import { useTheme } from '@/context/ThemeProvider';
import { Insight } from '@/types/schema';

export default function Carousel() {
    const [index, setIndex] = useState(0);
    const [slides, setSlides] = useState<Insight[]>([]);
    const [paused, setPaused] = useState(false);
    const { tier } = usePerformance();
    const { theme } = useTheme();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch slides from API or fallback
    useEffect(() => {
        const loadInsights = async () => {
            const data = await fetchInsights();
            setSlides(data);
        };
        loadInsights();
    }, []);

    // Rotate Logic
    const nextSlide = useCallback(() => {
        if (slides.length === 0) return;
        setIndex((prev) => (prev + 1) % slides.length);
    }, [slides.length]);

    const prevSlide = useCallback(() => {
        if (slides.length === 0) return;
        setIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }, [slides.length]);

    // Gestures
    const bind = useDrag(({ swipe: [swipeX], tap, memo, down }) => {
        if (tap || slides.length === 0) return; 
        if (down && !memo) {
          if (navigator.vibrate) navigator.vibrate(20);
          return index;
        }
        if (swipeX === -1) nextSlide();
        else if (swipeX === 1) prevSlide();
    });

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prevSlide();
            else if (e.key === 'ArrowRight') nextSlide();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [prevSlide, nextSlide]);

    // Auto-rotate (respects pause state)
    useEffect(() => {
        if (paused) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return;
        }
        timerRef.current = setInterval(() => nextSlide(), 7000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [nextSlide, paused]);

    // "The Lens" mask style
    const lensMask = {
        maskImage: 'radial-gradient(circle at center, black 50%, transparent 85%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 85%)',
    };
    
    // Performance-gated mask for LOW tier
    const lowTierLensMask = {
        maskImage: 'radial-gradient(circle at center, black 60%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 75%)',
    }

    if (slides.length === 0) return (
        <div className="w-full h-screen flex items-center justify-center" aria-label="Insights carousel" role="region">
            <p className="text-muted text-lg">Insights</p>
            <Loader2 className="animate-spin text-[var(--accent)] ml-3" />
        </div>
    );

    return (
        <div
            className="w-full h-screen flex flex-col items-center justify-center py-20 relative cursor-grab active:cursor-grabbing"
            aria-label="Insights carousel"
            role="region"
            {...bind()}
        >
            {/* Section Heading */}
            <h2 className="absolute top-8 left-1/2 -translate-x-1/2 z-20 text-xs uppercase tracking-[0.3em] text-muted font-sans">
                Insights
            </h2>

            {/* Background Media Layer (Bleeds into void) */}
            <div className="absolute inset-0 w-full h-full z-0">
                <AnimatePresence>
                    {slides.map((slide, i) => (
                        index === i && (
                            <motion.div
                                key={`${slide.id}-${tier}-bg`}
                                className="absolute inset-0 w-full h-full"
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                            >
                                {slide.mediaType === 'video' ? (
                                    <video 
                                        src={slide.mediaUrl} 
                                        autoPlay loop muted playsInline 
                                        onError={(e) => {
                                            (e.target as HTMLVideoElement).style.display = 'none';
                                            const parent = (e.target as HTMLVideoElement).parentElement;
                                            if (parent) {
                                                parent.style.background = 'linear-gradient(to bottom, #1a1a1a, #000000)';
                                            }
                                        }}
                                        className={`w-full h-full object-cover ${theme === 'dark' ? 'opacity-55' : 'opacity-80'}`}
                                    />
                                ) : (
                                    <Image 
                                        src={slide.mediaUrl} 
                                        alt={slide.title} 
                                        fill
                                        priority={i === 0}
                                        className={`object-cover ${theme === 'dark' ? 'opacity-55' : 'opacity-80'}`}
                                        sizes="100vw"
                                    />
                                )}
                            </motion.div>
                        )
                    ))}
                </AnimatePresence>
            </div>

            {/* Content Layer (Focal Point) */}
            <div 
                className="relative z-10 w-full h-full flex items-center justify-center px-6"
                style={tier === 'LOW' ? lowTierLensMask : lensMask}
            >
                <div className="max-w-3xl text-center space-y-8 pointer-events-none">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={`${index}-${tier}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.8, ease: "circOut" }}
                            className="space-y-6"
                        >
                            <h3 className="font-serif font-bold text-5xl md:text-7xl text-gold tracking-wide leading-tight">
                                {slides[index].title}
                            </h3>
                            <div className="h-px w-24 bg-gold/50 mx-auto shadow-sm" />
                            <p className="text-xl md:text-3xl text-white font-bold leading-relaxed italic font-serif drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                                {slides[index].description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Carousel Controls */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 pointer-events-auto">
                <button
                    onClick={prevSlide}
                    aria-label="Previous slide"
                    className="px-4 py-2 text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded-full backdrop-blur-sm transition-all"
                >
                    ← Prev
                </button>

                {/* Dot indicators */}
                <div className="flex items-center gap-2" role="tablist" aria-label="Carousel slides">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            role="tab"
                            aria-selected={i === index}
                            aria-label={`Slide ${i + 1} of ${slides.length}`}
                            onClick={() => setIndex(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                i === index ? 'bg-[var(--accent)] scale-125' : 'bg-white/30 hover:bg-white/60'
                            }`}
                        />
                    ))}
                </div>

                <button
                    onClick={nextSlide}
                    aria-label="Next slide"
                    className="px-4 py-2 text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded-full backdrop-blur-sm transition-all"
                >
                    Next →
                </button>

                <button
                    onClick={() => setPaused(p => !p)}
                    aria-label={paused ? 'Play auto-rotate' : 'Pause auto-rotate'}
                    className="px-3 py-2 text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded-full backdrop-blur-sm transition-all"
                >
                    {paused ? '▶ Play' : '⏸ Pause'}
                </button>
            </div>

            {/* Slide counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-xs text-white/40">
                Slide {index + 1} of {slides.length}
            </div>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg
            className={`animate-spin ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
}