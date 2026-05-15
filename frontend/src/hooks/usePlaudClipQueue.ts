/**
 * usePlaudClipQueue.ts
 * =====================
 * React hook owning the PLAUD clip queue lifecycle: upload, list,
 * delete, multi-select.
 *
 * Phase 3 Slice 3.10 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md.
 *
 * State shape:
 *   clips           - PlaudClip[] from server (DB-authoritative)
 *   isLoading       - initial load
 *   isUploading     - upload in flight
 *   uploadError     - last upload error (PlaudApiError)
 *   selectedIds     - Set<clipId> the trainer selected for merge
 *   rejectedClips   - last upload's rejected list (display once)
 *
 * Actions:
 *   refresh()                     - re-fetch list from server
 *   upload(files)                 - upload N files, refresh list, surface rejections
 *   removeClip(clipId)            - soft-delete + refresh
 *   toggleSelect(clipId)
 *   selectAll() / clearSelection()
 *   selectedCount, canMerge       - 1-5 selected
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  uploadClips,
  listClips,
  deleteClip,
  type PlaudClip,
  type PlaudUploadRejection,
  PlaudApiError,
} from '../services/plaudClipService';
import { buildClipTimeline, type ClipTimeline } from '../components/PlaudClipMerge/plaudClipTimeline';

export interface PlaudClipQueueState {
  clips: PlaudClip[];
  isLoading: boolean;
  isUploading: boolean;
  uploadError: PlaudApiError | null;
  rejectedClips: PlaudUploadRejection[];
  selectedIds: Set<string>;
  selectedCount: number;
  canMerge: boolean;
  timeline: ClipTimeline;
  selectedClipIdsInTimelineOrder: string[];
  refresh: () => Promise<void>;
  upload: (files: File[]) => Promise<void>;
  removeClip: (clipId: string) => Promise<void>;
  toggleSelect: (clipId: string) => void;
  selectClipIds: (clipIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

export function usePlaudClipQueue(): PlaudClipQueueState {
  const [clips, setClips] = useState<PlaudClip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<PlaudApiError | null>(null);
  const [rejectedClips, setRejectedClips] = useState<PlaudUploadRejection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { clips: fresh } = await listClips({ limit: 50 });
      if (!isMountedRef.current) return;
      setClips(fresh);
      // Drop selection entries that no longer exist
      setSelectedIds((prev) => {
        const validIds = new Set(fresh.map((c) => c.clipId));
        const next = new Set<string>();
        for (const id of prev) if (validIds.has(id)) next.add(id);
        return next;
      });
    } catch (err) {
      if (err instanceof PlaudApiError && err.code === 'PLAUD_DISABLED') {
        // Feature flag off — empty queue, no error toast
        if (isMountedRef.current) setClips([]);
      } else {
        // Surface other errors via uploadError so the panel can render
        // a banner. Reuses uploadError slot for simplicity.
        if (isMountedRef.current) setUploadError(err as PlaudApiError);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setRejectedClips([]);
    try {
      const { clips: accepted, rejected } = await uploadClips(files);
      if (!isMountedRef.current) return;
      if (rejected.length > 0) setRejectedClips(rejected);
      // Optimistic prepend; refresh will reconcile from server
      if (accepted.length > 0) {
        setClips((prev) => {
          const have = new Set(prev.map((c) => c.clipId));
          const fresh = accepted.filter((c) => !have.has(c.clipId));
          return [...fresh, ...prev];
        });
      }
      await refresh();
    } catch (err) {
      if (!isMountedRef.current) return;
      setUploadError(err as PlaudApiError);
    } finally {
      if (isMountedRef.current) setIsUploading(false);
    }
  }, [refresh]);

  const removeClip = useCallback(async (clipId: string) => {
    // Optimistic remove
    setClips((prev) => prev.filter((c) => c.clipId !== clipId));
    setSelectedIds((prev) => {
      if (!prev.has(clipId)) return prev;
      const next = new Set(prev);
      next.delete(clipId);
      return next;
    });
    try {
      await deleteClip(clipId);
    } catch (err) {
      // On failure, refresh to reconcile
      await refresh();
      if (isMountedRef.current) setUploadError(err as PlaudApiError);
    }
  }, [refresh]);

  const toggleSelect = useCallback((clipId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) next.delete(clipId);
      else next.add(clipId);
      return next;
    });
  }, []);

  const selectClipIds = useCallback((clipIds: string[]) => {
    const validIds = new Set(clips.map((clip) => clip.clipId));
    const next = clipIds.filter((clipId) => validIds.has(clipId)).slice(0, 5);
    setSelectedIds(new Set(next));
  }, [clips]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(clips.map((c) => c.clipId)));
  }, [clips]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;
  const canMerge = selectedCount >= 1 && selectedCount <= 5;
  const timeline = useMemo(() => buildClipTimeline(clips, selectedIds), [clips, selectedIds]);

  return {
    clips,
    isLoading,
    isUploading,
    uploadError,
    rejectedClips,
    selectedIds,
    selectedCount,
    canMerge,
    timeline,
    selectedClipIdsInTimelineOrder: timeline.selectedClipIdsInTimelineOrder,
    refresh,
    upload,
    removeClip,
    toggleSelect,
    selectClipIds,
    selectAll,
    clearSelection,
  };
}

export default usePlaudClipQueue;
