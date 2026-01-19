'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function SoundController() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0; // Start silent

    // Fade In Function
    const fadeIn = () => {
      if (fadeInterval.current) clearInterval(fadeInterval.current);
      
      fadeInterval.current = setInterval(() => {
        if (audio.volume < 0.4) {
          // Careful with floating point math, ensure we don't exceed 1
          audio.volume = Math.min(0.4, audio.volume + 0.05);
        } else {
          if (fadeInterval.current) clearInterval(fadeInterval.current);
        }
      }, 200);
    };

    // Try playing immediately
    const attemptPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
        fadeIn();
      } catch (err) {
        console.log("Autoplay prevented. Waiting for user interaction.");
        setIsPlaying(false);
      }
    };

    attemptPlay();

    // Unlock on first interaction if autoplay failed
    const unlockAudio = () => {
        if (audio.paused) {
            audio.play()
                .then(() => {
                    setIsPlaying(true);
                    fadeIn();
                })
                .catch((e) => console.error("Interaction play failed:", e));
        }
        // Remove listeners once unlocked
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      if (fadeInterval.current) clearInterval(fadeInterval.current);
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(e => console.error("Manual play failed:", e));
      setIsPlaying(true);
      // Ensure volume is up if they manually play
      if (audio.volume < 0.1) audio.volume = 0.4;
    }
  };

  return (
    <>
      <audio ref={audioRef} src="/assets/ambient.mp3" loop playsInline />
      
      <button
        onClick={(e) => {
          e.stopPropagation(); 
          toggleSound();
        }}
        className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-gold hover:bg-white/10 transition-all duration-300 group cursor-pointer"
        aria-label={isPlaying ? "Mute Sound" : "Play Sound"}
      >
        {isPlaying ? (
          <Volume2 size={20} className="opacity-80 group-hover:opacity-100" />
        ) : (
          <VolumeX size={20} className="opacity-50 group-hover:opacity-100" />
        )}
      </button>
    </>
  );
}