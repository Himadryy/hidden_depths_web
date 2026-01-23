'use client';

import { useState, useEffect } from 'react';
import { usePerformance } from '@/hooks/usePerformance';
import { PerformanceTier } from '@/utils/performance';

export default function DebugPanel() {
  const { tier, setTier } = usePerformance();
  const [isVisible, setIsVisible] = useState(false);

  // Toggle with 'D' key (for desktop) or triple tap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.shiftKey) {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) return <div className="fixed bottom-2 right-2 z-50 opacity-20 hover:opacity-100 cursor-pointer text-xs text-white bg-black/50 p-1 rounded" onClick={() => setIsVisible(true)}>⚙️</div>;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl text-white font-mono text-sm w-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gold font-bold">Performance Debug</h3>
        <button onClick={() => setIsVisible(false)} className="text-white/50 hover:text-white">✕</button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Current Tier</p>
          <div className="text-xl font-bold text-center p-2 bg-white/5 rounded border border-white/10">
            {tier.toUpperCase()}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Force Simulation</p>
          <div className="grid grid-cols-3 gap-2">
            {(['LOW', 'MID', 'ULTRA'] as PerformanceTier[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  console.log('[DebugPanel] Setting tier to:', t);
                  setTier(t);
                }}
                className={`p-2 rounded text-xs font-bold transition-all ${
                  tier === t 
                    ? 'bg-gold text-black shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-[10px] text-white/40 leading-relaxed">
            <p><strong>LOW:</strong> DPR 1.0, 12 Iterations, Base Noise</p>
            <p><strong>MID:</strong> DPR 1.2, 24 Iterations, Med Noise</p>
            <p><strong>ULTRA:</strong> DPR 1.5, 44 Iterations, High Noise</p>
        </div>
      </div>
    </div>
  );
}