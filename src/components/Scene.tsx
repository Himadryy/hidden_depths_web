'use client';

import PrismaticBurst from './PrismaticBurst';
import { usePerformance } from '@/hooks/usePerformance';

export default function Scene() {
  const { tier } = usePerformance();

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      {/* Background Animation: Prismatic Burst */}
      <div className="absolute inset-0 z-0">
          <PrismaticBurst
            key={tier}
            intensity={3}
            speed={0.8}
            distort={5}
            rayCount={30}
            colors={['#0A0A0A', '#1A1A1A', '#E0B873']}
            mixBlendMode="normal"
          />
      </div>
    </div>
  );
}