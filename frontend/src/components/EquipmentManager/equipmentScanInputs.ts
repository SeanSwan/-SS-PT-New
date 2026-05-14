export type EquipmentScanSource = 'camera' | 'gallery';

type ScanDeviceContext = {
  userAgent?: string;
  maxTouchPoints?: number;
};

export function isMobileScanDevice(context: ScanDeviceContext = {}): boolean {
  const userAgent = context.userAgent
    ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const maxTouchPoints = context.maxTouchPoints
    ?? (typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0);
  const coarsePointer = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    || (maxTouchPoints > 1 && coarsePointer);
}

export function getEquipmentScanInputProps(source: EquipmentScanSource) {
  return {
    accept: 'image/*',
    capture: source === 'camera' ? 'environment' : undefined,
  };
}
