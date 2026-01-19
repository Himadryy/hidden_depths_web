'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePerformance } from '@/context/PerformanceProvider';
import { useDrag } from '@use-gesture/react';

const slidesData = [
    { 
        id: 0,
        title: "Holistic Well-being", 
        description: "“Holistic well-being is the art of tending to every layer of our being—body, mind, and soul. True healing is not in fragments, but in weaving balance, where inner peace and outer strength walk hand in hand.”", 
        imageUrl: "/assets/wellbeing.jpg",
        type: 'image'
    },
    { 
        id: 1,
        title: "Physical & Mental Health", 
        description: "“Physical and mental health are two strings of the same melody—when one falls out of tune, the harmony is lost. Healing, in the eyes of a therapist, is not just curing pain but nurturing both body and mind to dance together in balance.”", 
        imageUrl: "/assets/health.jpg",
        type: 'image'
    },
    { 
        id: 2,
        title: "Mind-Body Harmony", 
        description: "“When mind and body move as one, life finds its natural rhythm. Harmony between thought and breath creates a sanctuary where strength and serenity can flourish side by side.”", 
        imageUrl: "/assets/harmony.mp4",
        type: 'video'
    },
    { 
        id: 3,
        title: "Ethics & Empathy", 
        description: "“Ethics is the compass, empathy the heart—together they guide healing with integrity and compassion. True care is not only knowing what is right, but also feeling what another feels.”", 
        imageUrl: "/assets/ethics.jpg",
        type: 'image'
    },
    { 
        id: 4,
        title: "Talk Freely, Live Happily", 
        description: "“Unspoken words weigh down the soul, but honest expression sets it free. In sharing openly, we invite healing, connection, and the simple joy of living without silence as a burden.”", 
        imageUrl: "/assets/happiness.mp4",
        type: 'video'
    }
];

export default function Carousel() {
    const [index, setIndex] = useState(0);
    const { tier } = usePerformance();

    // Rotate Logic
    const nextSlide = useCallback(() => {
        setIndex((prev) => (prev + 1) % slidesData.length);
    }, []);

    const prevSlide = useCallback(() => {
        setIndex((prev) => (prev - 1 + slidesData.length) % slidesData.length);
    }, []);

    // Gestures
    const bind = useDrag(({ swipe: [swipeX], tap }) => {
        if (tap) return; // Ignore taps
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
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [prevSlide, nextSlide]);

    // Auto-rotate every 5 seconds (paused on interaction could be added, but keeping simple for now)
    useEffect(() => {
        const timer = setInterval(() => {
            // Only auto-rotate if user hasn't interacted recently? 
            // For now, keep it simple, but maybe pause on low tier to save battery if needed.
            // Actually, let's keep it to drive the visual.
            nextSlide();
        }, 5000);
        return () => clearInterval(timer);
    }, [nextSlide]);

    const getSlideStyles = (i: number) => {
        const total = slidesData.length;
        // Calculate relative position including wrapping
        const position = (i - index + total) % total;

        const baseClasses = "absolute left-1/2 top-1/2 -translate-x-1/2 transition-all duration-700 ease-in-out cursor-grab active:cursor-grabbing";

        if (position === 0) {
            return `${baseClasses} z-20 scale-110 opacity-100 blur-0 -translate-y-1/2`; // Active (Center)
        } else if (position === total - 1) {
            // PERFORMANCE: Remove blur on low-end devices
            const blurClass = tier === 'low' ? '' : 'md:blur-[2px]';
            return `${baseClasses} z-10 scale-90 opacity-40 blur-0 ${blurClass} -translate-y-[80%]`; // Previous (Up)
        } else if (position === 1) {
            // PERFORMANCE: Remove blur on low-end devices
            const blurClass = tier === 'low' ? '' : 'md:blur-[2px]';
            return `${baseClasses} z-10 scale-90 opacity-40 blur-0 ${blurClass} -translate-y-[20%]`; // Next (Down)
        } else {
            return `${baseClasses} z-0 scale-75 opacity-0 pointer-events-none -translate-y-1/2`; // Hidden
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col md:flex-row items-center justify-center gap-12 py-20 overflow-hidden" {...bind()}>
            
            {/* Left: Text Content */}
            <div className="w-full md:w-1/2 text-left space-y-6 px-4 md:px-0 relative h-[300px] flex flex-col justify-center pointer-events-none">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-4"
                    >
                        <h2 className="font-display text-4xl md:text-5xl text-gold">
                            {slidesData[index].title}
                        </h2>
                        <p className="text-lg md:text-xl text-white leading-relaxed">
                            {slidesData[index].description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Right: 3D Card Stack */}
            <div className="w-full md:w-1/2 h-[500px] relative perspective-[1000px] touch-pan-y">
                {slidesData.map((slide, i) => (
                    <div
                        key={slide.id}
                        className={`w-[280px] h-[400px] rounded-2xl overflow-hidden ${tier === 'low' ? 'shadow-lg' : 'shadow-2xl'} border border-white/10 ${getSlideStyles(i)}`}
                    >
                        {slide.type === 'video' ? (
                            <video 
                                src={slide.imageUrl} 
                                autoPlay={index === i && tier !== 'low'} // Only autoplay if active and not on low-end device
                                loop 
                                muted 
                                playsInline 
                                controls={tier === 'low' && index === i} // Show controls on low-end so user can play if they want
                                className="w-full h-full object-cover pointer-events-none" // Disable video pointer events to allow swipe
                            />
                        ) : (
                            <Image 
                                src={slide.imageUrl} 
                                alt={slide.title} 
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover pointer-events-none" // Disable image drag
                            />
                        )}
                        
                        {/* Dark Gradient Overlay for readability if we add text on cards later */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                ))}
            </div>
            
            {/* Mobile Hint */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 md:hidden text-white/40 text-sm animate-pulse">
                Swipe to explore
            </div>
        </div>
    );
}
