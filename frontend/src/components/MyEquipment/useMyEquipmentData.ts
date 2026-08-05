/**
 * useMyEquipmentData — data + scan workflow hook for the My Equipment surface
 * ===========================================================================
 * Wraps useEquipmentAPI for the client/user self-serve surface (blueprint
 * §4.3 / S5). Simplified vs the trainer Equipment Manager: one photo at a
 * time, no auto-retry queue, review always through the shared scan tray.
 * Client-side profile rules mirror the S4 API (home/park/custom, max 3) so
 * users never see a 400. Ownership checks remain server-side.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getEquipmentApiErrorMessage,
  useEquipmentAPI,
  validateEquipmentPhoto,
} from '../../hooks/useEquipmentAPI';
import type {
  EquipmentItem, EquipmentProfile, EquipmentScanCandidate, EquipmentScanDuplicate, EquipmentScanError,
} from '../../hooks/useEquipmentAPI';
import { deriveActiveProfile } from '../Shared/EquipmentContextChip.helpers';
import {
  buildDuplicateQuantityMerge, buildEquipmentScanBatch, buildManualItemDraftFromCandidate,
  getCandidateName, removeBatchDuplicateItem, removeBatchPossibleItem,
  replaceBatchItem, updateBatchItemStatus,
} from '../EquipmentManager/equipmentScanBatch';
import type { EquipmentScanBatch } from '../EquipmentManager/equipmentScanBatch';
import { approveSelectedScanItems, rejectSelectedScanItems } from '../EquipmentManager/equipmentScanBatchActions';
import { getProfileCapState, isUserLocationType } from './myEquipmentPatterns';

const candidateReviewIndex = (
  candidate: EquipmentScanCandidate | EquipmentScanDuplicate,
  fallbackIndex: number,
): number => (Number.isInteger(candidate.candidateIndex) ? Number(candidate.candidateIndex) : fallbackIndex);

export function useMyEquipmentData() {
  const api = useEquipmentAPI();
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanBatch, setScanBatch] = useState<EquipmentScanBatch | null>(null);
  const [batchActionPending, setBatchActionPending] = useState(false);
  const failedScanFileRef = useRef<File | null>(null);

  const capState = useMemo(() => getProfileCapState(profiles), [profiles]);
  const activeProfile = useMemo(() => {
    const derived = deriveActiveProfile({
      profiles,
      selectedId: selectedProfileId,
      userHasInteracted: false,
    });
    // Self-serve surface always lands somewhere: fall back to the first place
    // when derivation is ambiguous (multiple places, none default).
    return profiles.find((profile) => profile.id === derived.profileId) ?? profiles[0] ?? null;
  }, [profiles, selectedProfileId]);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const res = await api.listProfiles();
      setProfiles(res.profiles);
    } catch (err) {
      setProfilesError(getEquipmentApiErrorMessage(err, 'Could not load your places. Check your connection and try again.'));
    } finally {
      setProfilesLoading(false);
    }
  }, [api]);

  const loadItems = useCallback(async (profileId: number) => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const res = await api.listItems(profileId);
      setItems(res.items);
    } catch (err) {
      setItemsError(getEquipmentApiErrorMessage(err, 'Could not load your gear. Check your connection and try again.'));
    } finally {
      setItemsLoading(false);
    }
  }, [api]);

  useEffect(() => { void loadProfiles(); }, [loadProfiles]);

  const activeProfileId = activeProfile?.id ?? null;
  useEffect(() => {
    if (activeProfileId == null) { setItems([]); return; }
    setItems([]);
    void loadItems(activeProfileId);
  }, [activeProfileId, loadItems]);

  const selectProfile = useCallback((profileId: number) => {
    setSelectedProfileId(profileId);
    setScanBatch(null);
    setScanPreview(null);
    setScanError(null);
  }, []);

  const createLocation = useCallback(async (data: { name: string; locationType: string; description?: string }) => {
    if (capState.atCap) {
      setCreateError('You can keep up to 3 places. Remove one to add another.');
      return false;
    }
    if (!isUserLocationType(data.locationType)) {
      setCreateError('Pick Home, Park / Outdoor, or Somewhere else.');
      return false;
    }
    if (!data.name.trim()) {
      setCreateError('Give this place a name first.');
      return false;
    }
    setCreatePending(true);
    setCreateError(null);
    try {
      const res = await api.createProfile({ ...data, name: data.name.trim() });
      await loadProfiles();
      setSelectedProfileId(res.profile.id);
      return true;
    } catch (err) {
      setCreateError(getEquipmentApiErrorMessage(err, 'Could not add this place. Please try again.'));
      return false;
    } finally {
      setCreatePending(false);
    }
  }, [api, capState.atCap, loadProfiles]);

  // ── Scan (one photo at a time; failed photo retained for retry) ──────────
  const scanPhoto = useCallback(async (file: File) => {
    if (!activeProfile) return;
    const validationError = validateEquipmentPhoto(file);
    if (validationError) { setScanError(validationError); return; }

    failedScanFileRef.current = null;
    setScanBatch(null);
    setScanError(null);
    setScanPreview(null);
    const reader = new FileReader();
    reader.onload = () => setScanPreview(reader.result as string);
    reader.readAsDataURL(file);
    setScanning(true);
    try {
      const result = await api.scanEquipment(activeProfile.id, file);
      const batch = buildEquipmentScanBatch(result, file.name)
        ?? (result.item ? {
          fileName: file.name,
          createdItems: [result.item],
          possibleItems: [],
          duplicates: [],
          scanSession: result.scanSession,
          degraded: result.degraded === true,
        } : null);
      setScanBatch(batch);
      if (!batch) setScanPreview(null);
      void loadItems(activeProfile.id);
    } catch (err) {
      failedScanFileRef.current = file;
      setScanBatch(buildEquipmentScanBatch((err as EquipmentScanError).scanResponse, file.name));
      setScanError(getEquipmentApiErrorMessage(err, `Scan failed for ${file.name}. Try again in a moment.`));
    } finally {
      setScanning(false);
    }
  }, [activeProfile, api, loadItems]);

  const retryScan = useCallback(() => {
    const file = failedScanFileRef.current;
    if (file) void scanPhoto(file);
  }, [scanPhoto]);

  const dismissScanError = useCallback(() => {
    failedScanFileRef.current = null;
    setScanError(null);
  }, []);

  const dismissBatch = useCallback(() => {
    setScanBatch(null);
    setScanPreview(null);
  }, []);

  const refreshAfterAction = useCallback(() => {
    if (activeProfile) void loadItems(activeProfile.id);
    void loadProfiles();
  }, [activeProfile, loadItems, loadProfiles]);

  const approveItems = useCallback(async (selected: EquipmentItem[]) => {
    if (!activeProfile) return;
    const pending = selected.filter((item) => item.approvalStatus === 'pending');
    if (pending.length === 0) return;
    setBatchActionPending(true);
    try {
      const { approvedItems, failedCount } = await approveSelectedScanItems({ api, profileId: activeProfile.id, items: pending });
      setScanBatch((current) => approvedItems.reduce((batch, item) => replaceBatchItem(batch, item), current));
      setScanError(failedCount > 0 ? `${failedCount} ${failedCount === 1 ? 'item' : 'items'} could not be added. Review them individually.` : null);
      refreshAfterAction();
    } finally {
      setBatchActionPending(false);
    }
  }, [activeProfile, api, refreshAfterAction]);

  const rejectItems = useCallback(async (selected: EquipmentItem[]) => {
    if (!activeProfile) return;
    const pending = selected.filter((item) => item.approvalStatus === 'pending');
    if (pending.length === 0) return;
    setBatchActionPending(true);
    try {
      const { rejectedIds, failedCount } = await rejectSelectedScanItems({ api, profileId: activeProfile.id, items: pending });
      setScanBatch((current) => [...rejectedIds].reduce((batch, id) => updateBatchItemStatus(batch, id, 'rejected'), current));
      setScanError(failedCount > 0 ? `${failedCount} ${failedCount === 1 ? 'item' : 'items'} could not be removed. Review them individually.` : null);
      refreshAfterAction();
    } finally {
      setBatchActionPending(false);
    }
  }, [activeProfile, api, refreshAfterAction]);

  const approveSingle = useCallback(async (item: EquipmentItem, overrides?: { name?: string }) => {
    if (!activeProfile) return;
    try {
      const res = await api.approveItem(activeProfile.id, item.id, overrides);
      setScanBatch((current) => replaceBatchItem(current, res.item));
      refreshAfterAction();
    } catch (err) {
      setScanError(getEquipmentApiErrorMessage(err, 'Could not add this item. Please try again.'));
    }
  }, [activeProfile, api, refreshAfterAction]);

  const rejectSingle = useCallback(async (item: EquipmentItem) => {
    if (!activeProfile) return;
    try {
      await api.rejectItem(activeProfile.id, item.id);
      setScanBatch((current) => updateBatchItemStatus(current, item.id, 'rejected'));
      refreshAfterAction();
    } catch (err) {
      setScanError(getEquipmentApiErrorMessage(err, 'Could not remove this item. Please try again.'));
    }
  }, [activeProfile, api, refreshAfterAction]);

  const addPossibleItem = useCallback(async (candidate: EquipmentScanCandidate, candidateIndex: number) => {
    if (!activeProfile) return;
    setBatchActionPending(true);
    try {
      const res = await api.addItem(activeProfile.id, buildManualItemDraftFromCandidate(candidate));
      const reviewSessionId = scanBatch?.scanSession?.reviewSessionId;
      if (reviewSessionId) {
        void Promise.resolve(api.reviewScanCandidate(activeProfile.id, {
          reviewSessionId,
          candidateIndex: candidateReviewIndex(candidate, candidateIndex),
          candidateStatus: 'possible',
          outcome: 'approved',
          equipmentItemId: res.item.id,
        })).catch(() => undefined);
      }
      setScanBatch((current) => removeBatchPossibleItem(current, candidateIndex));
      refreshAfterAction();
    } catch (err) {
      setScanError(getEquipmentApiErrorMessage(err, `Could not add ${getCandidateName(candidate)}. Please try again.`));
    } finally {
      setBatchActionPending(false);
    }
  }, [activeProfile, api, refreshAfterAction, scanBatch]);

  const mergeDuplicate = useCallback(async (
    duplicate: EquipmentScanDuplicate,
    duplicateIndex: number,
    matchedItem: EquipmentItem,
  ) => {
    if (!activeProfile) return;
    setBatchActionPending(true);
    try {
      await api.updateItem(activeProfile.id, matchedItem.id, buildDuplicateQuantityMerge(matchedItem, duplicate));
      setScanBatch((current) => removeBatchDuplicateItem(current, duplicateIndex));
      refreshAfterAction();
    } catch (err) {
      setScanError(getEquipmentApiErrorMessage(err, `Could not merge ${getCandidateName(duplicate)}. Please try again.`));
    } finally {
      setBatchActionPending(false);
    }
  }, [activeProfile, api, refreshAfterAction]);

  return {
    profiles, profilesLoading, profilesError, loadProfiles,
    activeProfile, selectProfile,
    items, itemsLoading, itemsError, loadItems,
    capState, createLocation, createPending, createError, setCreateError,
    scanning, scanError, scanPreview, scanBatch, batchActionPending,
    scanPhoto, retryScan, canRetryScan: failedScanFileRef.current !== null,
    dismissScanError, dismissBatch,
    approveItems, rejectItems, approveSingle, rejectSingle,
    addPossibleItem, mergeDuplicate,
  };
}

export default useMyEquipmentData;
