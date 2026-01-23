'use client';

import { useState, useEffect } from 'react';
import { usePerformance } from '@/hooks/usePerformance';
import { PerformanceTier } from '@/utils/performance';

export default function DebugPanel() {
  const { tier, setTier } = usePerformance();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log("🔧 Debug Panel available: Press Shift + D");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.shiftKey) setIsVisible(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/80 backdrop-blur-md border border-black/10 p-4 rounded-xl shadow-xl text-black font-mono text-sm w-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gold font-bold">System Status</h3>
        <button onClick={() => setIsVisible(false)} className="text-black/30 hover:text-black">✕</button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-black/40">Tier</p>
          <div className="text-xl font-bold text-center p-2 bg-black/5 rounded">
            {tier}
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2">
            {(['LOW', 'MID', 'ULTRA'] as PerformanceTier[]).map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`p-2 rounded text-[10px] font-bold transition-all ${
                  tier === t 
                    ? 'bg-black text-white' 
                    : 'bg-black/5 text-black hover:bg-black/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
