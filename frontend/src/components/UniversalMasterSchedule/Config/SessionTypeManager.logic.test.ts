import { describe, expect, it } from 'vitest';
import {
  buildFormFromSessionType,
  buildSessionTypePayload,
  createEmptySessionTypeForm,
  validateSessionTypeForm,
} from './SessionTypeManager.logic';

describe('SessionTypeManager credit-cost truth', () => {
  it('defaults new paid session types to one credit', () => {
    expect(createEmptySessionTypeForm().creditsRequired).toBe(1);
  });

  it('round-trips an existing multi-credit type through the edit payload', () => {
    const form = buildFormFromSessionType({
      id: 7,
      name: 'Partner Training',
      duration: 60,
      bufferBefore: 0,
      bufferAfter: 0,
      creditsRequired: 2,
      color: '#8B5CF6',
      isActive: true,
      sortOrder: 0,
    });

    expect(form.creditsRequired).toBe(2);
    expect(buildSessionTypePayload(form).creditsRequired).toBe(2);
  });

  it.each([-1, 1.5, Number.NaN])('rejects invalid credit cost %p', (creditsRequired) => {
    const form = {
      ...createEmptySessionTypeForm(),
      name: 'Assessment',
      creditsRequired,
    };

    expect(validateSessionTypeForm(form)).toMatch(/credit/i);
  });

  it('allows explicit zero-credit assessments', () => {
    const form = {
      ...createEmptySessionTypeForm(),
      name: 'Assessment',
      creditsRequired: 0,
    };

    expect(validateSessionTypeForm(form)).toBeNull();
    expect(buildSessionTypePayload(form).creditsRequired).toBe(0);
  });
});
