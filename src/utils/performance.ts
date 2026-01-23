export type PerformanceTier = 'DETECTING' | 'ULTRA' | 'MID' | 'LOW';

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
      tier: 'DETECTING',
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
  const connection = (navigator as any).connection || {};
  const saveData = !!connection.saveData;
  const effectiveType = connection.effectiveType || '4g';

  let tier: PerformanceTier = 'LOW';

  // HEURISTICS based on PROJECT_OPTIMIZATION spec
  if (cores >= 8 && memory >= 8) {
    tier = 'ULTRA';
  } else if (cores >= 4) {
    tier = 'MID';
  } else {
    tier = 'LOW';
  }

  return {
    tier,
    cores,
    memory,
    isLowPowerMode: false,
    saveData,
    effectiveType,
  };
};