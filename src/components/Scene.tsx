'use client';

import CausticOcean from './CausticOcean';

export default function Scene() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <div className="absolute inset-0 z-0">
          <CausticOcean />
      </div>
    </div>
  );
}
