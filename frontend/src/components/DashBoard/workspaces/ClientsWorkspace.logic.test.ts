import { describe, expect, it } from 'vitest';

import {
  getClientDetailTabFromSearchParams,
  getClientTrainingSectionFromSearchParams,
} from './ClientsWorkspace.logic';

describe('ClientsWorkspace route state parsing', () => {
  it('accepts the workout-history return section after a saved full-page log', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=history');

    expect(getClientTrainingSectionFromSearchParams(params)).toBe('history');
  });

  it('accepts the saved-plans return section after a saved full-page plan', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=plans');

    expect(getClientTrainingSectionFromSearchParams(params)).toBe('plans');
  });

  it('rejects unknown training sections instead of passing them into the Client Hub', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=javascript:alert(1)');

    expect(getClientTrainingSectionFromSearchParams(params)).toBeNull();
  });

  it('accepts a shareable progress detail tab route', () => {
    const params = new URLSearchParams('clientId=61&tab=progress');

    expect(getClientDetailTabFromSearchParams(params)).toBe('progress');
  });

  it('rejects unsafe detail tab route values', () => {
    const params = new URLSearchParams('clientId=61&tab=javascript:alert(1)');

    expect(getClientDetailTabFromSearchParams(params)).toBeNull();
  });
});
