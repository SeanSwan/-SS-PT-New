import { describe, expect, it } from 'vitest';
import {
  getEquipmentApiErrorMessage,
  getEquipmentScanErrorPayload,
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

  it('prefers backend response text over generic request errors', () => {
    expect(
      getEquipmentApiErrorMessage(
        {
          message: 'Request failed with status code 429',
          response: { data: { error: 'Rate limit exceeded. Maximum 10 scans per hour.' } },
        },
        'Scan failed. Try again.',
      ),
    ).toBe('Rate limit exceeded. Maximum 10 scans per hour.');
  });

  it('preserves duplicate scan metadata from failed scan responses', () => {
    const payload = {
      success: false,
      error: 'Detected equipment already exists in this profile.',
      duplicates: [{ suggestedName: 'Dumbbell Rack', confidence: 0.91, status: 'duplicate' }],
      candidates: [{ suggestedName: 'Dumbbell Rack', confidence: 0.91 }],
    };

    expect(getEquipmentScanErrorPayload({ response: { data: payload } })).toBe(payload);
    expect(getEquipmentScanErrorPayload({ response: { data: { error: 'No scan metadata' } } })).toBeUndefined();
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
