/**
 * ContactNotifications.alertState — SWA-138 S4 client for the per-admin
 * alert read-state API (/api/admin/alert-state). Gives the computed finance
 * alerts the persistence the contact half got in S3: acks and archives
 * survive refresh and are scoped to the acting admin.
 */

import { useCallback, useState } from 'react';
import type { Notification } from './ContactNotifications.types';

type AxiosLike = {
  get: (url: string) => Promise<{ data: any }>;
  post: (url: string, body?: unknown) => Promise<{ data: any }>;
};

export interface ArchivedAlert {
  refType: string;
  refId: string;
  archivedAt: string;
  snapshot: {
    title?: string;
    message?: string;
    type?: string;
    priority?: string;
    timestamp?: string;
  } | null;
}

export interface AlertClaim {
  adminId: number;
  claimedAt: string;
  mine: boolean;
}

export interface AlertStateEntry {
  readAt: string | null;
  archivedAt: string | null;
}

const keyOf = (refType: string, refId: string | number) => `${refType}:${refId}`;

/** refType + refId for any notification in this widget. */
export const alertRefOf = (n: Notification): { refType: string; refId: string } =>
  n.type === 'contact'
    ? { refType: 'contact', refId: String(n.contactId ?? n.id) }
    : { refType: 'finance', refId: n.id };

export function useAlertReadState(authAxios: AxiosLike) {
  const [readState, setReadState] = useState<Map<string, AlertStateEntry>>(new Map());
  // SWA-138 S4b: claims are CROSS-admin — the whole point is seeing that a
  // teammate already has an item, so two people don't work the same refund.
  const [claims, setClaims] = useState<Map<string, AlertClaim>>(new Map());

  const refreshReadState = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/admin/alert-state');
      const rows: Array<{ refType: string; refId: string } & AlertStateEntry> =
        res.data?.state ?? [];
      setReadState(new Map(rows.map((r) => [
        keyOf(r.refType, r.refId),
        { readAt: r.readAt, archivedAt: r.archivedAt },
      ])));
    } catch {
      // Read-state is an overlay — a failed fetch degrades to "nothing acked",
      // never blocks the alerts themselves.
    }
  }, [authAxios]);

  const markLocal = useCallback((refType: string, refId: string, field: keyof AlertStateEntry) => {
    setReadState((prev) => {
      const next = new Map(prev);
      const existing = next.get(keyOf(refType, refId)) ?? { readAt: null, archivedAt: null };
      next.set(keyOf(refType, refId), { ...existing, [field]: new Date().toISOString() });
      return next;
    });
  }, []);

  const ackAlert = useCallback((n: Notification) => {
    const ref = alertRefOf(n);
    authAxios.post('/api/admin/alert-state/ack', ref).catch(() => {});
    markLocal(ref.refType, ref.refId, 'readAt');
  }, [authAxios, markLocal]);

  const bulkAck = useCallback(async (items: Notification[]) => {
    if (items.length === 0) return;
    const refs = items.slice(0, 100).map(alertRefOf);
    await authAxios.post('/api/admin/alert-state/bulk', { op: 'ack', items: refs });
    refs.forEach((r) => markLocal(r.refType, r.refId, 'readAt'));
  }, [authAxios, markLocal]);

  /** What the alert said, captured at archive time so the archive stays readable. */
  const snapshotOf = (n: Notification) => ({
    title: n.title,
    message: n.message,
    type: n.type,
    priority: n.priority,
    timestamp: n.timestamp,
  });

  const archiveAlert = useCallback(async (n: Notification) => {
    const ref = alertRefOf(n);
    await authAxios.post('/api/admin/alert-state/archive', { ...ref, snapshot: snapshotOf(n) });
    markLocal(ref.refType, ref.refId, 'archivedAt');
  }, [authAxios, markLocal]);

  /** Clear-all: archives (never destroys) every visible alert, in capped batches. */
  const archiveMany = useCallback(async (items: Notification[]) => {
    if (items.length === 0) return 0;
    let done = 0;
    for (let i = 0; i < items.length; i += 100) {
      const batch = items.slice(i, i + 100);
      await authAxios.post('/api/admin/alert-state/bulk', {
        op: 'archive',
        items: batch.map((n) => ({ ...alertRefOf(n), snapshot: snapshotOf(n) })),
      });
      batch.forEach((n) => {
        const ref = alertRefOf(n);
        markLocal(ref.refType, ref.refId, 'archivedAt');
      });
      done += batch.length;
    }
    return done;
  }, [authAxios, markLocal]);

  const fetchArchived = useCallback(async (): Promise<ArchivedAlert[]> => {
    const res = await authAxios.get('/api/admin/alert-state/archived?limit=100');
    return Array.isArray(res.data?.archived) ? res.data.archived : [];
  }, [authAxios]);

  const restoreAlert = useCallback(async (entry: ArchivedAlert) => {
    await authAxios.post('/api/admin/alert-state/restore', {
      refType: entry.refType, refId: entry.refId,
    });
    setReadState((prev) => {
      const next = new Map(prev);
      const k = keyOf(entry.refType, entry.refId);
      const existing = next.get(k);
      if (existing) next.set(k, { ...existing, archivedAt: null });
      return next;
    });
  }, [authAxios]);

  const isRead = useCallback((n: Notification) => {
    const ref = alertRefOf(n);
    return Boolean(readState.get(keyOf(ref.refType, ref.refId))?.readAt);
  }, [readState]);

  const refreshClaims = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/admin/alert-state/claims');
      const rows: Array<{ refType: string; refId: string } & AlertClaim> = res.data?.claims ?? [];
      setClaims(new Map(rows.map((r) => [
        keyOf(r.refType, r.refId),
        { adminId: r.adminId, claimedAt: r.claimedAt, mine: r.mine },
      ])));
    } catch {
      // Claims are an overlay; a failure just means no chips render.
    }
  }, [authAxios]);

  const claimOf = useCallback((n: Notification): AlertClaim | null => {
    const ref = alertRefOf(n);
    return claims.get(keyOf(ref.refType, ref.refId)) ?? null;
  }, [claims]);

  /** Claim, or release when the acting admin already holds it. */
  const toggleClaim = useCallback(async (n: Notification) => {
    const ref = alertRefOf(n);
    const existing = claims.get(keyOf(ref.refType, ref.refId));
    const release = Boolean(existing?.mine);
    try {
      await authAxios.post('/api/admin/alert-state/claim', { ...ref, release });
    } catch {
      // 409 = another admin got there first; the refresh below shows who.
    }
    await refreshClaims();
  }, [authAxios, claims, refreshClaims]);

  const isArchived = useCallback((n: Notification) => {
    const ref = alertRefOf(n);
    return Boolean(readState.get(keyOf(ref.refType, ref.refId))?.archivedAt);
  }, [readState]);

  return {
    refreshReadState, ackAlert, bulkAck, isRead, isArchived,
    refreshClaims, claimOf, toggleClaim,
    archiveAlert, archiveMany, fetchArchived, restoreAlert,
  };
}
