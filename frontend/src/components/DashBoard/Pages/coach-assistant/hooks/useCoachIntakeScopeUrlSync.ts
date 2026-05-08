/**
 * useCoachIntakeScopeUrlSync.ts
 * =============================
 * Keeps the Coach intake queue scope in sync with the browser URL so operator
 * filters survive refreshes and direct links.
 */
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CoachIntakeQueueScope } from '../../../../../services/coachIntakeService';

const VALID_SCOPES = new Set<CoachIntakeQueueScope>([
  'actionable',
  'ready_review',
  'needs_client',
  'needs_clarification',
  'duplicate_hold',
  'unprocessed',
  'processing',
  'failed',
]);

function isQueueScope(value: string | null): value is CoachIntakeQueueScope {
  return Boolean(value && VALID_SCOPES.has(value as CoachIntakeQueueScope));
}

export function useCoachIntakeScopeUrlSync({
  activeScope,
  setScope,
}: {
  activeScope?: string;
  setScope?: (scope: CoachIntakeQueueScope) => void;
}): (scope: CoachIntakeQueueScope) => void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlScope = new URLSearchParams(location.search).get('scope');
    if (urlScope && !isQueueScope(urlScope)) {
      const params = new URLSearchParams(location.search);
      params.delete('scope');
      const search = params.toString();
      navigate({
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      }, { replace: true });
      return;
    }
    if (!isQueueScope(urlScope) || urlScope === activeScope) return;
    setScope?.(urlScope);
  }, [activeScope, location.hash, location.pathname, location.search, navigate, setScope]);

  return useCallback((scope: CoachIntakeQueueScope) => {
    setScope?.(scope);
    const params = new URLSearchParams(location.search);
    params.set('scope', scope);
    navigate({
      pathname: location.pathname,
      search: `?${params.toString()}`,
      hash: location.hash,
    }, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate, setScope]);
}

export default useCoachIntakeScopeUrlSync;
