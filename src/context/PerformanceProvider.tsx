'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PerformanceTier, getDeviceCapabilities } from '@/utils/performance';

interface PerformanceContextType {
  tier: PerformanceTier;
  isLoaded: boolean;
  setTier: (tier: PerformanceTier) => void;
}

const PerformanceContext = createContext<PerformanceContextType>({
  tier: 'mid',
  isLoaded: false,
  setTier: () => {},
});

export const usePerformance = () => useContext(PerformanceContext);

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTierState] = useState<PerformanceTier>('mid');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const caps = getDeviceCapabilities();
    // eslint-disable-next-line
    setTierState(caps.tier);
    setIsLoaded(true);
    
    // Log for debugging (can be removed later)
    console.log(`[PerformanceSystem] Initialized with tier: ${caps.tier}`, caps);
  }, []);

  const setTier = (newTier: PerformanceTier) => {
    setTierState(newTier);
  };

  const value = { tier, isLoaded, setTier };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};
