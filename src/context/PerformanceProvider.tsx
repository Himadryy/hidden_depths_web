'use client';

import React, { useEffect, useState } from 'react';
import { PerformanceTier, getDeviceCapabilities } from '@/utils/performance';
import { PerformanceContext } from '@/hooks/usePerformance';

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTierState] = useState<PerformanceTier>('DETECTING');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Small delay to ensure browser metrics are stable
    const timer = setTimeout(() => {
      const caps = getDeviceCapabilities();
      setTierState(caps.tier);
      setIsLoaded(true);
      console.log(`[PerformanceSystem] Initialized with tier: ${caps.tier}`, caps);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const setTier = (newTier: PerformanceTier) => {
    console.log('[PerformanceProvider] Changing tier from', tier, 'to', newTier);
    setTierState(newTier);
  };

  const value = { tier, isLoaded, setTier };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};
