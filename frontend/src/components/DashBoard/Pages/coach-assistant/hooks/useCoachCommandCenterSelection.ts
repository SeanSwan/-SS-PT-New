/**
 * ============================================================================
 * FILE: useCoachCommandCenterSelection.ts
 * PURPOSE: Plan 55 §3 C3 — the controller's selection wiring, in one place.
 * ============================================================================
 * Rule 4 extraction: the controller is at the 300-line cap, so the C3 wiring
 * lives here and the controller composes it. This module owns NO admission rule
 * of its own — it supplies the action's exact location observation, mounts the
 * C2 adapter BEFORE the transports (so they can be given the binding), turns the
 * raw route candidate into a REQUEST, and runs the ONE commit consumer.
 */
import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  buildThreadSelectionSearchParams,
  parseRouteClientId,
  parseRouteThreadId,
} from '../CoachCommandCenter.routeContext';
import {
  useApplyCoachSelectionCommit,
  useRequestCoachRouteSelection,
} from '../CoachCommandCenter.controllerEffects';
import type { CoachCommandRole } from '../CoachCommandCenter.roleConfig';
import { useCoachSessionSelection } from './useCoachSessionSelection';

/** A stable key for "the location/router observation we last requested". */
const observationKeyFor = (searchKey: string, routeClientId: number | null, routeThreadId: number | null): string =>
  `${searchKey}|${routeClientId ?? 'none'}|${routeThreadId ?? 'none'}`;

export function useCoachCommandCenterSelection(params: {
  actorId?: string | number | null;
  /** The ACTUAL raw authenticated role, never the dashboard presentation role. */
  rawRole?: string | null;
  audienceRole: CoachCommandRole;
  setActiveThreadId: Dispatch<SetStateAction<number | null>>;
}) {
  const { actorId, rawRole, audienceRole, setActiveThreadId } = params;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const observation = useMemo(
    () => ({ pathname: location.pathname, search: location.search, hash: location.hash }),
    [location.hash, location.pathname, location.search],
  );
  const selection = useCoachSessionSelection({ actorId, rawRole, audienceRole, observation });
  const searchKey = searchParams.toString();
  const routeClientId = useMemo(() => parseRouteClientId(searchParams.get('clientId')), [searchKey]);
  const routeThreadId = useMemo(() => parseRouteThreadId(searchParams.get('threadId')), [searchKey]);

  // An explicit raw route/pin is a CANDIDATE. Nothing is loaded, announced or
  // activated until the adapter has admitted it and the commit has been applied.
  // An ABSENT client/thread is the explicit UNSCOPED candidate, not "no request":
  // plan 55 §5 requires a fresh receipt for unscoped staff mode too, otherwise the
  // staff surface would stay masked forever with no client selected.
  useRequestCoachRouteSelection(
    observationKeyFor(searchKey, routeClientId, routeThreadId),
    { targetUserId: routeClientId, conversationId: routeThreadId },
    selection,
  );

  const applyCommit = useCallback((instructions: {
    kind: 'admit' | 'return' | 'discard';
    targetUserId: number | null;
    threadId: number | null;
    anchor: { pathname: string; search: string; hash: string } | null;
  }) => {
    // OWN-COMMIT OBSERVATION. When the live route ALREADY expresses the accepted
    // tuple, the router is not touched at all: rewriting it here would drop the
    // route-context keys (`intent`, `teachPrompt`, `returnTo`, …) that the same
    // URL carries, and would reopen the selection loop it is acknowledging.
    const alreadyThere = instructions.kind !== 'return'
      && instructions.targetUserId === routeClientId
      && instructions.threadId === routeThreadId;
    if (instructions.kind === 'return' && instructions.anchor) {
      // Exact original location. Never rebuilt through URLSearchParams: duplicate
      // keys, their order and their encoding must survive.
      navigate(
        { pathname: instructions.anchor.pathname, search: instructions.anchor.search, hash: instructions.anchor.hash },
        { replace: true },
      );
    } else if (!alreadyThere) {
      setSearchParams(buildThreadSelectionSearchParams(searchParams, instructions.targetUserId, instructions.threadId), { replace: true });
    }
    if (!alreadyThere) setActiveThreadId(instructions.threadId);
    return { targetUserId: instructions.targetUserId, threadId: instructions.threadId };
  }, [navigate, routeClientId, routeThreadId, searchParams, setActiveThreadId, setSearchParams]);

  useApplyCoachSelectionCommit(selection, applyCommit);

  // BINDING POLICY (plan 55 §9 hostile decision): a raw client/user actor keeps
  // the existing server-owned self flow and is therefore NOT bound at all, while
  // an unrecognised raw role IS bound — with no admission available — so it
  // cannot inherit the admin presentation as authority.
  const binding = selection.capability === 'client' ? undefined : selection.publicationBinding;
  return { selection, binding, routeClientId, routeThreadId, searchKey };
}

export default useCoachCommandCenterSelection;
