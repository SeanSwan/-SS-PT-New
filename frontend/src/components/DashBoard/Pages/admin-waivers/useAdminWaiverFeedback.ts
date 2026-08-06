/**
 * ============================================================================
 * FILE: useAdminWaiverFeedback.ts
 * PURPOSE: Single feedback channel for the admin waiver surface — failures on
 *          screen until dismissed, successes through the app toast system.
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Before 2026-08-05 six code paths in
 * AdminWaiversManager.tsx swallowed their errors into `console.error`, so a
 * failed approve/reject/attach looked identical to a no-op. This hook is the
 * one place that turns those rejections into something an admin can see.
 *
 * CHANNEL SPLIT (deliberate — not duplicated output):
 *   FAILURE  → inline dismissible banner, persists until dismissed. A failed
 *              legal/consent action demands a decision; it must not vanish on
 *              a 4-second timer while the admin is looking elsewhere.
 *   SUCCESS  → the app's existing toast (`hooks/use-toast`, mounted in
 *              App.tsx around the whole router), transient. Confirmations
 *              should get out of the way.
 *
 * FAIL-SAFE: the toast is read through `useOptionalToast`, so if this surface
 * is ever rendered outside the ToastProvider the success confirmation falls
 * back to an auto-dismissing banner rather than disappearing (or crashing the
 * subtree, which is what the throwing `useToast` would do).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalToast } from '../../../../hooks/use-toast';
import { describeWaiverError } from './adminWaiverFeedback';

export type WaiverAlertTone = 'error' | 'success';

export interface WaiverAlert {
  id: string;
  tone: WaiverAlertTone;
  title: string;
  message: string;
}

const SUCCESS_FALLBACK_MS = 6000;

let alertSeq = 0;
const nextAlertId = () => {
  alertSeq += 1;
  return `waiver-alert-${Date.now().toString(36)}-${alertSeq}`;
};

export interface AdminWaiverFeedback {
  alerts: WaiverAlert[];
  /** Surface a failed call. Returns the alert id. */
  reportError: (err: unknown, action: string, unchanged?: string) => string;
  /** Confirm a completed mutation. */
  reportSuccess: (message: string, title?: string) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
}

export const useAdminWaiverFeedback = (): AdminWaiverFeedback => {
  const [alerts, setAlerts] = useState<WaiverAlert[]>([]);
  const toastApi = useOptionalToast();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  /**
   * Mirror of `alerts`. `pushAlert` has to answer "is this banner already on
   * screen, and if so what is ITS id?" BEFORE it returns — callers key
   * follow-up dismissals off that id (the manager clears its list-failure
   * banner once a refresh succeeds). A setState updater cannot return a value,
   * hence the ref.
   */
  const alertsRef = useRef<WaiverAlert[]>([]);

  const commit = useCallback((next: WaiverAlert[]) => {
    alertsRef.current = next;
    setAlerts(next);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const dismissAlert = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    commit(alertsRef.current.filter((alert) => alert.id !== id));
  }, [commit]);

  const clearAlerts = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    commit([]);
  }, [commit]);

  const pushAlert = useCallback((
    tone: WaiverAlertTone,
    title: string,
    message: string,
    autoDismissMs?: number,
  ): string => {
    // Retrying a failing action must not stack identical banners — reuse the
    // one already on screen so its id stays dismissable.
    const existing = alertsRef.current.find(
      (a) => a.tone === tone && a.title === title && a.message === message,
    );
    if (existing) return existing.id;

    const id = nextAlertId();
    const appended = [...alertsRef.current, { id, tone, title, message }];
    // Keep the banner stack readable — oldest falls off past 4.
    commit(appended.length > 4 ? appended.slice(appended.length - 4) : appended);

    if (autoDismissMs && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        timers.current.delete(id);
        commit(alertsRef.current.filter((alert) => alert.id !== id));
      }, autoDismissMs);
      timers.current.set(id, timer);
    }

    return id;
  }, [commit]);

  const reportError = useCallback((
    err: unknown,
    action: string,
    unchanged?: string,
  ): string => {
    // Keep the console trail for support/debugging — the banner is additive.
    console.error(`[AdminWaivers] ${action} failed:`, err);
    const { title, message } = describeWaiverError(err, action, unchanged);
    return pushAlert('error', title, message);
  }, [pushAlert]);

  const reportSuccess = useCallback((message: string, title = 'Waiver updated') => {
    if (toastApi) {
      toastApi.toast({ variant: 'success', title, description: message });
      return;
    }
    pushAlert('success', title, message, SUCCESS_FALLBACK_MS);
  }, [pushAlert, toastApi]);

  return { alerts, reportError, reportSuccess, dismissAlert, clearAlerts };
};

export default useAdminWaiverFeedback;
