'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePerformance } from '@/hooks/usePerformance';
import { useDrag } from '@use-gesture/react';
import { INSIGHTS_DATA } from '@/lib/data';

export default function Carousel() {
    const [index, setIndex] = useState(0);
    const { tier } = usePerformance();

    // Rotate Logic
    const nextSlide = useCallback(() => {
        setIndex((prev) => (prev + 1) % INSIGHTS_DATA.length);
    }, []);

    const prevSlide = useCallback(() => {
        setIndex((prev) => (prev - 1 + INSIGHTS_DATA.length) % INSIGHTS_DATA.length);
    }, []);

    // Gestures
    const bind = useDrag(({ swipe: [swipeX], tap }) => {
        if (tap) return; 
        if (swipeX === -1) {
            nextSlide();
            if (navigator.vibrate) navigator.vibrate(50);
        } else if (swipeX === 1) {
            prevSlide();
            if (navigator.vibrate) navigator.vibrate(50);
        }
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
        const timer = setInterval(() => nextSlide(), 6000);
        return () => clearInterval(timer);
    }, [nextSlide]);

    const getGlassStyle = (isActive: boolean) => {
        // PERFORMANCE TIER: Disable blur on LOW tier to save GPU
        if (tier === 'LOW') {
            return isActive 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/5 border-white/10 opacity-40';
        }
        // MID/ULTRA: Full Glassmorphism
        return isActive
            ? 'backdrop-blur-md bg-white/5 border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]'
            : 'backdrop-blur-[2px] bg-white/5 border-white/5 opacity-40';
    };

    const getSlideStyles = (i: number) => {
        const total = INSIGHTS_DATA.length;
        const position = (i - index + total) % total;
        
        const baseClasses = "absolute left-1/2 top-1/2 -translate-x-1/2 transition-all duration-700 ease-in-out cursor-grab active:cursor-grabbing border rounded-2xl overflow-hidden";

        if (position === 0) { // Active
            return `${baseClasses} z-20 scale-110 -translate-y-1/2 ${getGlassStyle(true)}`;
        } else if (position === total - 1) { // Prev
            return `${baseClasses} z-10 scale-90 -translate-y-[80%] ${getGlassStyle(false)}`;
        } else if (position === 1) { // Next
            return `${baseClasses} z-10 scale-90 -translate-y-[20%] ${getGlassStyle(false)}`;
        } else { // Hidden
            return `${baseClasses} z-0 scale-75 opacity-0 pointer-events-none -translate-y-1/2`;
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col md:flex-row items-center justify-center gap-12 py-20 overflow-hidden" {...bind()}>
            
            {/* Left: Text Content (Decoupled & Animated) */}
            <div className="w-full md:w-1/2 text-left space-y-8 px-6 md:px-0 relative h-[300px] flex flex-col justify-center pointer-events-none z-30">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.6, ease: "circOut" }}
                        className="space-y-6"
                    >
                        <h2 className="font-serif text-5xl md:text-6xl text-gold tracking-wide">
                            {INSIGHTS_DATA[index].title}
                        </h2>
                        <div className="h-px w-24 bg-gold/50" />
                        <p className="text-xl md:text-2xl text-white/90 font-light leading-relaxed italic font-serif">
                            {INSIGHTS_DATA[index].description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Right: Glassmorphic Cards (Decoupled Data) */}
            <div className="w-full md:w-1/2 h-[500px] relative perspective-[1000px] touch-pan-y">
                {INSIGHTS_DATA.map((slide, i) => (
                    <div
                        key={`${slide.id}-${tier}`}
                        className={`w-[280px] h-[420px] ${getSlideStyles(i)}`}
                    >
                        {/* Media Container - Reduced opacity for Glass Effect */}
                        <div className="absolute inset-0 opacity-60 mix-blend-overlay">
                            {slide.mediaType === 'video' ? (
                                <video 
                                    src={slide.mediaUrl} 
                                    autoPlay={index === i}
                                    loop 
                                    muted 
                                    playsInline 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Image 
                                    src={slide.mediaUrl} 
                                    alt={slide.title} 
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                />
                            )}
                        </div>
                        
                        {/* Glass Reflection Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                    </div>
                ))}
            </div>
            
            {/* Mobile Hint */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 md:hidden text-white/30 text-xs tracking-widest uppercase animate-pulse">
                Swipe to reflect
            </div>
        </div>
    );
}