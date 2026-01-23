'use client';

import { createContext, useContext } from 'react';
import { PerformanceTier } from '@/utils/performance';

interface PerformanceContextType {
  tier: PerformanceTier;
  isLoaded: boolean;
  setTier: (tier: PerformanceTier) => void;
}

export const PerformanceContext = createContext<PerformanceContextType>({
  tier: 'DETECTING',
  isLoaded: false,
  setTier: () => {},
});

export const usePerformance = () => useContext(PerformanceContext);