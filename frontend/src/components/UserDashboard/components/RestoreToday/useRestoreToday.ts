/** Owner-scoped Restore requests; the API owns recovery advice and earned XP. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../../../../services/api.service';
import { logger } from '../../../../utils/logger';
import type { RestoreBlockKey, RestoreItem, RestoreTodayData, RestoreTodayState } from './RestoreCard.types';
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(i => typeof i === 'string');
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const optionalText = (v: unknown) => v == null || typeof v === 'string';
const points = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function validData(v: unknown): v is RestoreTodayData {
  if (!record(v) || !['full','strip','cold'].includes(String(v.mode)) ||
      !['rest','active-recovery','unplanned','training','already-trained','no-plan'].includes(String(v.dayState)) ||
      !strings(v.completedExerciseIds) || !Array.isArray(v.blocks)) return false;
  if (v.mode === 'cold' && (!record(v.coldStart) || !['no-plan','pain-needs-coach','library-curating'].includes(String(v.coldStart.reason)))) return false;
  if (v.focus != null && (!record(v.focus) || !optionalText(v.focus.clientSummary))) return false;
  return v.blocks.every(b => record(b) && ['inhibit','lengthen','activate','cardio'].includes(String(b.key)) &&
    typeof b.provenance === 'string' && optionalText(b.conflictNote) && Array.isArray(b.items) &&
    b.items.every(i => record(i) && text(i.exerciseId) && text(i.name) && typeof i.dose === 'string' && points(i.xp) &&
      optionalText(i.thumbnailUrl) && optionalText(i.videoUrl) && strings(i.why) && strings(i.dataSources)));
}
type Admission = { owner: string | null; active: boolean; generation: number; pending: Set<string> };
type ViewState = { admission: Admission; data: RestoreTodayData | null; loading: boolean; error: boolean; completed: Set<string>; lastXpAwarded: number | null };
const empty = (admission: Admission): ViewState => ({ admission, data: null, loading: !!admission.owner, error: false, completed: new Set(), lastXpAwarded: null });
export function useRestoreToday(userId: unknown): RestoreTodayState {
  const owner = (typeof userId === 'string' || typeof userId === 'number') && String(userId).trim() ? String(userId) : null;
  const [reloadToken, setReloadToken] = useState(0);
  const admission = useMemo<Admission>(() => ({ owner, active: false, generation: 0, pending: new Set() }), [owner, reloadToken]);
  const activeRef = useRef(admission);
  activeRef.current = admission;
  const [state, setState] = useState<ViewState>(() => empty(admission));
  // Hide another admission's data during render, before passive cleanup.
  const view = state.admission === admission ? state : empty(admission);
  useEffect(() => {
    admission.active = true;
    const generation = ++admission.generation;
    const current = () => activeRef.current === admission && admission.active && admission.generation === generation;
    setState(empty(admission));
    if (owner) {
      apiService.get<{ success: boolean; data: unknown }>('/api/recovery/today').then(response => {
        if (!current()) return;
        const payload = response.data?.data;
        if (response.data?.success !== true || !validData(payload)) throw new Error('Invalid recovery response');
        setState({ admission, data: payload, loading: false, error: false, completed: new Set(payload.completedExerciseIds), lastXpAwarded: null });
      }).catch(() => {
        if (!current()) return;
        logger.warn('Restore panel unavailable');
        setState({ ...empty(admission), loading: false, error: true });
      });
    } else setState({ ...empty(admission), loading: false });
    return () => { admission.active = false; admission.pending.clear(); };
  }, [admission, owner]);
  const completeItem = useCallback(async (item: RestoreItem, blockKey: RestoreBlockKey) => {
    const generation = admission.generation;
    const current = () => activeRef.current === admission && admission.active && admission.generation === generation;
    if (!owner || !current() || view.loading || view.error || view.completed.has(item.exerciseId) || admission.pending.has(item.exerciseId)) return;
    const ownedItem = view.data?.blocks.find(b => b.key === blockKey)?.items.find(row => row.exerciseId === item.exerciseId);
    if (!ownedItem) return;
    admission.pending.add(item.exerciseId);
    setState(v => v.admission === admission ? { ...v, completed: new Set(v.completed).add(item.exerciseId) } : v);
    try {
      const response = await apiService.post<{ success: boolean; data: unknown }>('/api/recovery/complete', { exerciseId: ownedItem.exerciseId, blockKey, dataSources: ownedItem.dataSources });
      if (!current()) return;
      const result = response.data?.data;
      if (response.data?.success !== true || !record(result) || result.exerciseId !== ownedItem.exerciseId || typeof result.alreadyCompleted !== 'boolean' || !points(result.xpAwarded)) throw new Error('Unconfirmed recovery completion');
      if (!result.alreadyCompleted && (result.xpAwarded as number) > 0) {
        setState(v => v.admission === admission ? { ...v, lastXpAwarded: result.xpAwarded as number } : v);
      }
    } catch {
      if (!current()) return;
      logger.warn('Restore completion unconfirmed');
      setState(v => {
        if (v.admission !== admission) return v;
        const completed = new Set(v.completed); completed.delete(item.exerciseId);
        return { ...v, completed };
      });
    } finally { admission.pending.delete(item.exerciseId); }
  }, [admission, owner, view]);
  const retry = useCallback(() => {
    if (activeRef.current !== admission || !owner) return;
    admission.active = false;
    setReloadToken(token => token + 1);
  }, [admission, owner]);
  return { data: view.data, loading: view.loading, error: view.error, completed: view.completed, completeItem, retry, lastXpAwarded: view.lastXpAwarded };
}
export default useRestoreToday;
