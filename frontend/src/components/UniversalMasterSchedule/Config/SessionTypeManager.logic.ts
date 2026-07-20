import type { SessionType } from '../hooks/useSessionTypes';
import type { SessionTypeFormState, SessionTypePayload } from './SessionTypeManager.types';

export const DEFAULT_SESSION_TYPE_COLOR = '#8B5CF6';

export const createEmptySessionTypeForm = (): SessionTypeFormState => ({
  name: '',
  description: '',
  duration: 60,
  bufferBefore: 0,
  bufferAfter: 0,
  creditsRequired: 1,
  color: DEFAULT_SESSION_TYPE_COLOR,
  price: '',
  isActive: true
});

export const sortSessionTypes = (sessionTypes: SessionType[]) =>
  [...sessionTypes].sort((a, b) => a.sortOrder - b.sortOrder);

export const buildFormFromSessionType = (sessionType: SessionType): SessionTypeFormState => ({
  name: sessionType.name,
  description: sessionType.description ?? '',
  duration: sessionType.duration,
  bufferBefore: sessionType.bufferBefore,
  bufferAfter: sessionType.bufferAfter,
  color: sessionType.color || DEFAULT_SESSION_TYPE_COLOR,
  creditsRequired: sessionType.creditsRequired ?? 1,
  price: sessionType.price !== undefined && sessionType.price !== null ? String(sessionType.price) : '',
  isActive: sessionType.isActive
});

export const validateSessionTypeForm = (form: SessionTypeFormState): string | null => {
  const trimmedName = form.name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return 'Name must be between 2 and 100 characters.';
  }
  if (form.duration <= 0) {
    return 'Duration must be greater than 0.';
  }
  if (form.bufferBefore < 0 || form.bufferAfter < 0) {
    return 'Buffer values cannot be negative.';
  }
  if (!Number.isInteger(form.creditsRequired) || form.creditsRequired < 0) {
    return 'Credits required must be a non-negative whole number.';
  }
  return null;
};

export const buildSessionTypePayload = (form: SessionTypeFormState): SessionTypePayload => ({
  name: form.name.trim(),
  description: form.description.trim() || undefined,
  duration: Number(form.duration),
  bufferBefore: Number(form.bufferBefore),
  bufferAfter: Number(form.bufferAfter),
  color: form.color || DEFAULT_SESSION_TYPE_COLOR,
  price: form.price ? Number(form.price) : undefined,
  isActive: form.isActive,
  creditsRequired: Number(form.creditsRequired)
});
