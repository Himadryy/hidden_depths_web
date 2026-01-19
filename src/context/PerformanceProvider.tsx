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
  const [state, setState] = useState<PerformanceContextType>({
    tier: 'mid',
    isLoaded: false,
    setTier: () => {},
  });

  useEffect(() => {
    const caps = getDeviceCapabilities();
    setState({
      tier: caps.tier,
      isLoaded: true,
      setTier: (newTier: PerformanceTier) => {
        setState(prev => ({ ...prev, tier: newTier }));
      }
    });
    
    // Log for debugging (can be removed later)
    console.log(`[PerformanceSystem] Initialized with tier: ${caps.tier}`, caps);
  }, []);

  return (
    <PerformanceContext.Provider value={state}>
      {children}
    </PerformanceContext.Provider>
  );
};
