'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePerformance } from '@/hooks/usePerformance';
import { useDrag } from '@use-gesture/react';
import { INSIGHTS_DATA } from '@/lib/data';

export default function Carousel() {
    const [index, setIndex] = useState(0);
    const { tier } = usePerformance();

    // Memoize the slides data to prevent re-renders
    const slides = useMemo(() => INSIGHTS_DATA, []);

    // Rotate Logic
    const nextSlide = useCallback(() => {
        setIndex((prev) => (prev + 1) % slides.length);
    }, [slides.length]);

    const prevSlide = useCallback(() => {
        setIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }, [slides.length]);

    // Gestures
    const bind = useDrag(({ swipe: [swipeX], tap, memo, down }) => {
        if (tap) return; 
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

    // Auto-rotate
    useEffect(() => {
        const timer = setInterval(() => nextSlide(), 7000); // Slower rotation
        return () => clearInterval(timer);
    }, [nextSlide]);

    // "The Lens" mask style - Broadened for visibility
    const lensMask = {
        maskImage: 'radial-gradient(circle at center, black 50%, transparent 85%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 85%)',
    };
    
    // Performance-gated mask for LOW tier
    const lowTierLensMask = {
        maskImage: 'radial-gradient(circle at center, black 60%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 75%)',
    }

    return (
        <div className="w-full h-screen flex flex-col items-center justify-center py-20 relative cursor-grab active:cursor-grabbing" {...bind()}>
            
            {/* Background Media Layer (Bleeds into void) */}
            <div className="absolute inset-0 w-full h-full z-0">
                <AnimatePresence>
                    {slides.map((slide, i) => (
                        index === i && (
                            <motion.div
                                key={slide.id + "-bg"}
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
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Image 
                                        src={slide.mediaUrl} 
                                        alt={slide.title} 
                                        fill
                                        priority={i === 0}
                                        className="object-cover"
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
                {/* Centered Text Content */}
                <div className="max-w-3xl text-center space-y-8 pointer-events-none">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.8, ease: "circOut" }}
                            className="space-y-6"
                        >
                            <h2 className="font-serif text-5xl md:text-7xl text-black tracking-wide leading-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]">
                                {slides[index].title}
                            </h2>
                            <div className="h-px w-24 bg-black/50 mx-auto shadow-sm" />
                            <p className="text-xl md:text-3xl text-black/90 font-light leading-relaxed italic font-serif drop-shadow-[0_1px_5px_rgba(255,255,255,0.3)]">
                                {slides[index].description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

             {/* UI Hints Layer */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest uppercase animate-pulse z-20">
                Swipe or use Arrow Keys
            </div>
        </div>
    );
}
