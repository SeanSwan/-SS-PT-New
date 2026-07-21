/**
 * usePostSaveHandoffFlag.ts — runtime Launch Control flag for the Post-Save Handoff (2026-07-21).
 * Mirrors the shipped PrismCapture pattern: `/api/config/public-flags.postSaveHandoff` (runtime — the
 * admin Launch Control switch, wins when present → flip/kill with no rebuild) → QA localStorage
 * `ff_postSaveHandoff` → build-time `VITE_ENABLE_POST_SAVE_HANDOFF` → false. previewOverride wins over all
 * (Sean's preview-as lane). Module-scope memo: repeated mounts share ONE request.
 * SECURITY NOTE: this only controls whether the CLIENT renders the modal; the payload itself is gated
 * server-side (postSaveHandoffAssembler consults the same Launch Control flag) — no flag here can leak data.
 */
import { useEffect, useState } from 'react';
import { previewOverride } from '../../../config/previewFlags';
import { isPostSaveHandoffEnabled } from './postSaveHandoffFlag';

/** PURE precedence resolver — exported for tests. Runtime (true/false) is authoritative when present. */
export function resolvePostSaveHandoffFlag(
  runtime: boolean | null,
  qa: boolean | null,
  envFallback: boolean,
  preview: boolean,
): boolean {
  if (preview) return true;
  if (runtime !== null) return runtime;
  return qa ?? envFallback;
}

let flagsPromise: Promise<Record<string, unknown> | null> | null = null;
function fetchPublicFlags(): Promise<Record<string, unknown> | null> {
  if (!flagsPromise) {
    flagsPromise = fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('public-flags unavailable');
        return r.json();
      })
      .catch(() => {
        flagsPromise = null; // transient failure → allow a later retry
        return null;
      });
  }
  return flagsPromise;
}

function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_postSaveHandoff');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

/** Resolves the effective flag; starts at the build-time fallback (fail-closed) until runtime answers. */
export function usePostSaveHandoffFlag(): boolean {
  const [flag, setFlag] = useState<boolean>(() => isPostSaveHandoffEnabled());

  useEffect(() => {
    let alive = true;
    fetchPublicFlags().then((json) => {
      if (!alive) return;
      const runtime = json && typeof json.postSaveHandoff === 'boolean' ? Boolean(json.postSaveHandoff) : null;
      setFlag(resolvePostSaveHandoffFlag(runtime, qaOverride(), isPostSaveHandoffEnabled(), previewOverride('postSaveHandoff')));
    });
    return () => { alive = false; };
  }, []);

  return flag;
}
