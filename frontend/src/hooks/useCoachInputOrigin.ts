/**
 * FILE: useCoachInputOrigin.ts
 * PURPOSE: React adapter that keeps draft text and its Coach input provenance together.
 */
import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { mergeTypedDraftOrigin, type CoachInputOrigin } from './coachInputOrigin';
export { commandInputMode } from './coachInputOrigin';

export function useCoachInputOrigin(setCommandText: Dispatch<SetStateAction<string>>) {
  const [inputOrigin, setInputOrigin] = useState<CoachInputOrigin>('unknown');
  const setTrackedCommandText = useCallback((next: SetStateAction<string>) => {
    setCommandText((current) => {
      const nextValue = typeof next === 'function' ? next(current) : next;
      setInputOrigin((origin) => mergeTypedDraftOrigin(origin, current, nextValue));
      return nextValue;
    });
  }, [setCommandText]);
  return { inputOrigin, setInputOrigin, setTrackedCommandText };
}
