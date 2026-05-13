import { describe, expect, it } from 'vitest';
import {
  getEquipmentApiErrorMessage,
  validateEquipmentPhoto,
} from './useEquipmentAPI';

describe('useEquipmentAPI helpers', () => {
  it('preserves actionable scan errors returned by the backend', () => {
    expect(
      getEquipmentApiErrorMessage(
        new Error('AI scanning is not configured. Please add equipment manually.'),
        'Scan failed. Try again.',
      ),
    ).toBe('AI scanning is not configured. Please add equipment manually.');
  });

  it('validates equipment scan image type and size before upload', () => {
    const valid = new File(['image'], 'bench.webp', { type: 'image/webp' });
    const invalidType = new File(['image'], 'bench.gif', { type: 'image/gif' });
    const tooLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'bench.jpg', { type: 'image/jpeg' });

    expect(validateEquipmentPhoto(valid)).toBeNull();
    expect(validateEquipmentPhoto(invalidType)).toContain('JPG, PNG, or WebP');
    expect(validateEquipmentPhoto(tooLarge)).toContain('10MB');
  });
});
