/**
 * useRunnerStyle — reactive Runner Style selection (Swan Lens dimension).
 * useSyncExternalStore over the runnerStyles store so every consumer
 * (logger, Appearance Studio) re-renders on switch, cross-component,
 * without prop drilling.
 */
import { useSyncExternalStore, useCallback } from 'react';
import {
  readRunnerStyle,
  writeRunnerStyle,
  subscribeRunnerStyle,
  DEFAULT_RUNNER_STYLE,
  type RunnerStyleId,
} from './runnerStyles';

export function useRunnerStyle(): [RunnerStyleId, (id: RunnerStyleId) => void] {
  const style = useSyncExternalStore(
    subscribeRunnerStyle,
    readRunnerStyle,
    () => DEFAULT_RUNNER_STYLE,
  );
  const setStyle = useCallback((id: RunnerStyleId) => writeRunnerStyle(id), []);
  return [style, setStyle];
}
