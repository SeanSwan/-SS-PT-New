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

  const isRead = useCallback((n: Notification) => {
    const ref = alertRefOf(n);
    return Boolean(readState.get(keyOf(ref.refType, ref.refId))?.readAt);
  }, [readState]);

  const isArchived = useCallback((n: Notification) => {
    const ref = alertRefOf(n);
    return Boolean(readState.get(keyOf(ref.refType, ref.refId))?.archivedAt);
  }, [readState]);

  return { refreshReadState, ackAlert, bulkAck, isRead, isArchived };
}
