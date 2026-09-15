import { useEffect, useRef } from 'react';

// Epochs also invalidate A -> B -> A replies; checking only the final ID cannot.
export function usePlannerAsyncScope(clientId: number | null) {
  const scope = useRef({ clientId, epoch: 0, request: 0 });
  if (scope.current.clientId !== clientId) {
    scope.current = { clientId, epoch: scope.current.epoch + 1, request: scope.current.request };
  }
  useEffect(() => () => { scope.current.epoch++; }, []);
  return scope;
}
