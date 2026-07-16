/**
 * ============================================================================
 * FILE: useTrainingPlanProjections.ts
 * PURPOSE: Load bounded read-only plan projections for the current UMS lens.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Applies the build flag, waits for staff roster truth,
 * loads page one for each date/scope lens, and appends deduplicated later pages.
 * HOW IT FITS IN THE APP: The projection layer view owns this hook; appointment
 * Redux state and schedule mutation hooks remain untouched.
 * KEY DECISIONS: Request versions suppress stale responses. Errors expose safe
 * copy only, while retry keeps the same bounded range and authorization scope.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScheduleView } from '../../../redux/slices/scheduleSlice';
import {
  trainingPlanProjectionService,
  type TrainingPlanProjection,
  type TrainingPlanProjectionRequest,
  type TrainingPlanProjectionResponse,
} from '../../../services/training-plan-projection-service';
import {
  buildProjectionRange,
  normalizeProjectionClientScope,
  type ProjectionClientLike,
} from '../TrainingPlanProjectionLayer.logic';
import { trainingPlanScheduleProjectionsEnabled } from '../trainingPlanProjectionFeatureFlag';

export type TrainingPlanProjectionStatus = 'disabled' | 'waiting' | 'loading' | 'ready' | 'error';

interface ProjectionReader {
  getProjections: (input: TrainingPlanProjectionRequest) => Promise<TrainingPlanProjectionResponse>;
}

interface UseTrainingPlanProjectionsInput {
  enabled?: boolean;
  mode: 'admin' | 'trainer' | 'client';
  activeView: ScheduleView;
  currentDate: Date;
  clients: readonly ProjectionClientLike[];
  clientRosterLoading: boolean;
}

interface ProjectionState {
  status: Exclude<TrainingPlanProjectionStatus, 'disabled' | 'waiting'>;
  items: TrainingPlanProjection[];
  error: string | null;
  page: number;
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
}

const EMPTY_STATE: ProjectionState = {
  status: 'loading',
  items: [],
  error: null,
  page: 0,
  total: 0,
  hasMore: false,
  loadingMore: false,
};
const mergeItems = (
  current: readonly TrainingPlanProjection[],
  incoming: readonly TrainingPlanProjection[],
) => [...new Map([...current, ...incoming].map((item) => [item.projectionId, item])).values()];

export const useTrainingPlanProjections = (
  input: UseTrainingPlanProjectionsInput,
  reader: ProjectionReader = trainingPlanProjectionService,
) => {
  const enabled = input.enabled ?? trainingPlanScheduleProjectionsEnabled();
  const staffMode = input.mode === 'admin' || input.mode === 'trainer';
  const scope = useMemo(
    () => normalizeProjectionClientScope(input.clients),
    [input.clients],
  );
  const range = buildProjectionRange(input.activeView, input.currentDate);
  const scopeKey = scope.clientIds.join(',');
  const requestKey = `${input.mode}:${range.startDate}:${range.endDate}:${scopeKey}`;
  const [reloadVersion, setReloadVersion] = useState(0);
  const [state, setState] = useState<ProjectionState>(EMPTY_STATE);
  const requestVersion = useRef(0);
  const loadMoreRequest = useRef<{ key: string; page: number } | null>(null);
  const activeKey = useRef(requestKey);
  activeKey.current = requestKey;

  const waitingForRoster = enabled && staffMode && input.clientRosterLoading;
  const emptyStaffScope = enabled && staffMode && !input.clientRosterLoading && !scope.clientIds.length;
  const canLoad = enabled && !waitingForRoster && !emptyStaffScope;

  useEffect(() => {
    const version = ++requestVersion.current;
    if (!enabled || waitingForRoster) return undefined;
    if (emptyStaffScope) {
      setState({ ...EMPTY_STATE, status: 'ready' });
      return undefined;
    }

    let active = true;
    setState({ ...EMPTY_STATE, status: 'loading' });
    reader.getProjections({
      startDate: range.startDate,
      endDate: range.endDate,
      page: 1,
      limit: 100,
      clientIds: staffMode ? scope.clientIds : undefined,
    }).then((response) => {
      if (!active || version !== requestVersion.current) return;
      setState({
        status: 'ready',
        items: response.items,
        error: null,
        page: response.page,
        total: response.total,
        hasMore: response.hasMore,
        loadingMore: false,
      });
    }).catch(() => {
      if (!active || version !== requestVersion.current) return;
      setState({ ...EMPTY_STATE, status: 'error', error: 'Could not load planned training.' });
    });
    return () => { active = false; };
  }, [
    enabled,
    waitingForRoster,
    emptyStaffScope,
    reader,
    range.startDate,
    range.endDate,
    staffMode,
    scope.clientIds,
    scopeKey,
    reloadVersion,
  ]);

  const retry = useCallback(() => setReloadVersion((version) => version + 1), []);
  const loadMore = useCallback(async () => {
    if (
      !canLoad
      || state.loadingMore
      || !state.hasMore
      || loadMoreRequest.current?.key === requestKey
    ) return;
    const expectedKey = requestKey;
    const nextPage = state.page + 1;
    const request = { key: expectedKey, page: nextPage };
    loadMoreRequest.current = request;
    setState((current) => ({ ...current, loadingMore: true }));
    try {
      const response = await reader.getProjections({
        startDate: range.startDate,
        endDate: range.endDate,
        page: nextPage,
        limit: 100,
        clientIds: staffMode ? scope.clientIds : undefined,
      });
      if (activeKey.current !== expectedKey) return;
      setState((current) => ({
        ...current,
        status: 'ready',
        items: mergeItems(current.items, response.items),
        error: null,
        page: response.page,
        total: response.total,
        hasMore: response.hasMore,
        loadingMore: false,
      }));
    } catch {
      if (activeKey.current !== expectedKey) return;
      setState((current) => ({
        ...current,
        error: 'Could not load more planned training.',
        loadingMore: false,
      }));
    } finally {
      if (loadMoreRequest.current === request) loadMoreRequest.current = null;
    }
  }, [
    canLoad,
    state.loadingMore,
    state.hasMore,
    state.page,
    requestKey,
    reader,
    range.startDate,
    range.endDate,
    staffMode,
    scope.clientIds,
  ]);

  const status: TrainingPlanProjectionStatus = !enabled
    ? 'disabled'
    : waitingForRoster
      ? 'waiting'
      : emptyStaffScope
        ? 'ready'
        : state.status;

  return {
    enabled,
    status,
    items: emptyStaffScope ? [] : state.items,
    error: state.error,
    total: emptyStaffScope ? 0 : state.total,
    hasMore: emptyStaffScope ? false : state.hasMore,
    loadingMore: state.loadingMore,
    clientScopeLimited: staffMode && scope.limited,
    totalScopedClients: scope.totalValidClients,
    retry,
    loadMore,
  };
};