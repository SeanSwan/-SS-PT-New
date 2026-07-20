/**
 * ============================================================================
 * FILE: AppearanceSyncBridge.tsx — FUSION F1 (lens-world-fusion §6, B4/M3)
 * PURPOSE: Renders nothing; keeps the committed Smart Lens appearance in
 * sync with the server so a member's look follows them across devices.
 * MOUNT LAW (B4): INSIDE AuthProvider + ToastProvider (it consumes both) —
 * the StyleLensProvider is an ancestor of the whole app, so its context is
 * available here; code at the provider's own mount line cannot see auth.
 * SYNC LAWS: server wins only when NEWER (updatedAt, cosmetic-data LWW);
 * a sync-in commit is never pushed back (M3 — lastPushedRef guard); a
 * failed push NEVER rolls back the local commit — it tells the truth via
 * the exact offline receipt copy instead.
 * ============================================================================
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/authContextState';
// The MOUNTED toast system (hooks/use-toast — App wraps us in its provider).
// NOT context/ToastContext.jsx: that legacy provider is mounted nowhere and
// its useToast returns undefined — a silent no-op (F0/F1 review, F1-1).
import { useToast } from '../../hooks/use-toast';
import { useStyleLensAppearance, type AppearanceProfile } from '../../core/style-lens-os';
import { fetchProfile, pushProfile } from '../../adapters/style-lens-swan/serverAppearanceSync';

export const OFFLINE_RECEIPT_COPY =
  "Saved on this device — will sync when you're back online.";

const AppearanceSyncBridge: React.FC = () => {
  const auth = useAuth();
  const toast = useToast();
  const { state, registry, beginPreview, cancelPreview, commitPreview } =
    useStyleLensAppearance();
  const userId = auth?.user?.id ?? null;

  const fetchedForUserRef = useRef<number | string | null>(null);
  const previousUserRef = useRef<number | string | null>(null);
  // Seeded with the mount-time stamp so the initial committed state never pushes.
  const lastPushedRef = useRef<string | null>(state.committed.updatedAt ?? null);
  const pendingRemoteRef = useRef<AppearanceProfile | null>(null);
  // Live committed stamp — read at fetch-RESOLVE time, never from a stale
  // effect closure (F1-4: a commit landing mid-fetch must win LWW).
  const committedStampRef = useRef<string | null>(state.committed.updatedAt ?? null);
  committedStampRef.current = state.committed.updatedAt ?? null;

  // Sync-IN phase 1: fetch once per authenticated user; STAGE the remote
  // profile. (beginPreview -> immediate commitPreview would read a stale
  // snapshot before the reducer flushes — the commit happens in phase 2.)
  useEffect(() => {
    if (!userId || fetchedForUserRef.current === userId) return;
    // User SWITCH on a shared browser: the server value is authoritative for
    // the new user regardless of the previous user's residual local stamp.
    const isUserSwitch =
      previousUserRef.current !== null && previousUserRef.current !== userId;
    fetchedForUserRef.current = userId;
    previousUserRef.current = userId;
    void (async () => {
      const remote = await fetchProfile();
      if (!remote?.profile?.updatedAt) return;
      // Version-skew guard (F1-3): an id this bundle cannot resolve would
      // wedge the provider in a rejected state — skip sync-in, keep local.
      if (registry?.resolve?.(remote.profile.styleLensId)?.id !== remote.profile.styleLensId) {
        return;
      }
      const localStamp = Date.parse(committedStampRef.current ?? '') || 0;
      const remoteStamp = Date.parse(remote.profile.updatedAt) || 0;
      if (!isUserSwitch && remoteStamp <= localStamp) return;
      // Guard BEFORE the commit so the push effect skips this stamp (M3).
      lastPushedRef.current = remote.profile.updatedAt;
      pendingRemoteRef.current = remote.profile;
      beginPreview(remote.profile);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Sync-IN phase 2: once the staged preview lands in state, commit it.
  // Deferred a microtask: child effects run BEFORE the provider's own
  // snapshot-sync effect, and commitPreview reads that snapshot.
  useEffect(() => {
    const pending = pendingRemoteRef.current;
    if (!pending || state.preview?.updatedAt !== pending.updatedAt) return;
    pendingRemoteRef.current = null;
    queueMicrotask(() =>
      void commitPreview().then((applied) => {
        // Never leave a wedged phantom preview if validation rejects (F1-3).
        if (!applied) cancelPreview();
      }),
    );
  }, [state.preview, commitPreview, cancelPreview]);

  // Push-OUT user-originated commits (fires on committed changes).
  useEffect(() => {
    const stamp = state.committed.updatedAt;
    if (!userId || !stamp || stamp === lastPushedRef.current) return;
    lastPushedRef.current = stamp;
    void pushProfile(state.committed).then((ok) => {
      if (!ok) toast.info(OFFLINE_RECEIPT_COPY);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.committed.updatedAt, userId]);

  return null;
};

export default AppearanceSyncBridge;
