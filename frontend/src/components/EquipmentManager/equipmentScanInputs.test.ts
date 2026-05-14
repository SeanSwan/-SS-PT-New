import { describe, expect, it } from 'vitest';
import {
  createEquipmentScanQueue,
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
      multiple: true,
    });
  });

  it('builds an ordered scan queue from multiple selected gallery photos', () => {
    const first = new File(['a'], 'rack.jpg', { type: 'image/jpeg', lastModified: 10 });
    const second = new File(['b'], 'dumbbells.webp', { type: 'image/webp', lastModified: 20 });

    const queue = createEquipmentScanQueue([first, second], 'gallery');

    expect(queue).toHaveLength(2);
    expect(queue.map(item => item.file)).toEqual([first, second]);
    expect(queue.map(item => item.fileName)).toEqual(['rack.jpg', 'dumbbells.webp']);
    expect(queue.map(item => item.source)).toEqual(['gallery', 'gallery']);
    expect(queue[0].id).not.toBe(queue[1].id);
  });
});
