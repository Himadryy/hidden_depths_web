'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function SoundController() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // initialize audio
    const audio = new Audio('/assets/ambient.mp3');
    audio.loop = true;
    audio.volume = 0; // Start silent for fade-in
    audioRef.current = audio;

    // Try to autoplay on load (often blocked, but worth a try)
    const tryPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
        fadeIn(audio);
      } catch (e) {
        // Autoplay blocked - wait for interaction
        console.log("Autoplay blocked, waiting for interaction");
      }
    };

    tryPlay();

    // Interaction listener (Unlock audio on first click/tap/keydown)
    const handleInteraction = () => {
      if (!hasInteracted && audioRef.current) {
        setHasInteracted(true);
        if (audioRef.current.paused) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
            fadeIn(audioRef.current!);
          }).catch(e => console.error("Audio failed:", e));
        }
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const fadeIn = (audio: HTMLAudioElement) => {
    let vol = 0;
    const fade = setInterval(() => {
      if (vol < 0.4) { // Cap max volume at 40% so it's subtle
        vol += 0.02;
        audio.volume = vol;
      } else {
        clearInterval(fade);
      }
    }, 100); // Smooth 2-second fade
  };

  const toggleSound = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent triggering the global interaction listener again
        toggleSound();
      }}
      className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-gold hover:bg-white/10 transition-all duration-300 group"
      aria-label="Toggle Sound"
    >
      {isPlaying ? (
        <Volume2 size={20} className="opacity-80 group-hover:opacity-100" />
      ) : (
        <VolumeX size={20} className="opacity-50 group-hover:opacity-100" />
      )}
    </button>
  );
}
