import type { SetStateAction } from 'react';

export function resolveVoiceCommandText(next: SetStateAction<string>, current: string): string {
  const nextValue = typeof next === 'function' ? next(current) : next;
  return nextValue === '' ? current : nextValue;
}

export function capturedVoiceText(current: string, captured: string): string {
  return current.trim() ? current : captured;
}
