import type { InputHTMLAttributes } from 'react';

export type EquipmentScanSource = 'camera' | 'gallery';

export type EquipmentScanQueueItem = {
  id: string;
  file: File;
  fileName: string;
  source: EquipmentScanSource;
};

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

export function getEquipmentScanInputProps(source: EquipmentScanSource): Pick<InputHTMLAttributes<HTMLInputElement>, 'accept' | 'capture' | 'multiple'> {
  if (source === 'camera') {
    return {
      accept: 'image/*',
      capture: 'environment',
    };
  }

  return {
    accept: 'image/*',
    capture: undefined,
    multiple: true,
  };
}

export function createEquipmentScanQueue(
  files: ArrayLike<File> | Iterable<File>,
  source: EquipmentScanSource,
  startIndex = 0,
): EquipmentScanQueueItem[] {
  return Array.from(files).map((file, index) => ({
    id: [
      source,
      startIndex + index,
      file.name || 'equipment-photo',
      file.size,
      file.lastModified,
    ].join('-'),
    file,
    fileName: file.name || `Equipment photo ${startIndex + index + 1}`,
    source,
  }));
}
