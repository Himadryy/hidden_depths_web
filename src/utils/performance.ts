export type PerformanceTier = 'low' | 'mid' | 'high';

export interface DeviceCapabilities {
  tier: PerformanceTier;
  cores: number;
  memory: number; // in GB
  isLowPowerMode: boolean;
  saveData: boolean;
  effectiveType: string;
}

export const getDeviceCapabilities = (): DeviceCapabilities => {
  if (typeof window === 'undefined') {
    return {
      tier: 'mid',
      cores: 4,
      memory: 4,
      isLowPowerMode: false,
      saveData: false,
      effectiveType: '4g',
    };
  }

  const cores = navigator.hardwareConcurrency || 4;
  // @ts-expect-error - navigator.deviceMemory is not in all TS versions
  const memory = navigator.deviceMemory || 4;
  // @ts-expect-error - navigator.connection is experimental
  const connection = navigator.connection || {};
  const saveData = !!connection.saveData;
  const effectiveType = connection.effectiveType || '4g';

  let tier: PerformanceTier = 'mid';

  // HEURISTICS
  if (cores <= 2 || memory <= 2 || saveData || ['slow-2g', '2g', '3g'].includes(effectiveType)) {
    tier = 'low';
  } else if (cores >= 8 && memory >= 8 && effectiveType === '4g') {
    tier = 'high';
  } else if (cores >= 4 && memory >= 4) {
    tier = 'mid';
  }

  return {
    tier,
    cores,
    memory,
    isLowPowerMode: false, // Hard to detect reliably in browser without battery API
    saveData,
    effectiveType,
  };
};
