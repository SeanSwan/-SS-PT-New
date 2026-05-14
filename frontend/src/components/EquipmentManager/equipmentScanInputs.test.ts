import { describe, expect, it } from 'vitest';
import {
  getEquipmentScanInputProps,
  isMobileScanDevice,
} from './equipmentScanInputs';

describe('equipment scan mobile input helpers', () => {
  it('detects mobile devices from common phone user agents', () => {
    expect(isMobileScanDevice({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      maxTouchPoints: 5,
    })).toBe(true);

    expect(isMobileScanDevice({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      maxTouchPoints: 0,
    })).toBe(false);
  });

  it('keeps camera capture separate from mobile photo library selection', () => {
    expect(getEquipmentScanInputProps('camera')).toEqual({
      accept: 'image/*',
      capture: 'environment',
    });

    expect(getEquipmentScanInputProps('gallery')).toEqual({
      accept: 'image/*',
      capture: undefined,
    });
  });
});
