/**
 * Dashboards v2 — useWorldKey (KIMI-DASHBOARDS-CORRECTED §2.1). Read-only observer.
 *
 * Returns the current world/lens identity to STAMP on the crystallize POST body only (so a
 * crystallization records which world it was earned under). `worldId`/`data-world` is Lane-A-pending;
 * the shipped identity is `data-style-lens` on <html> (the committed lens). Pure read — never writes,
 * never re-skins anything (world re-skin is CSS-only via the gate's scoped vars).
 */
import { useSyncExternalStore } from 'react';

const KEY = 'data-style-lens';

function getWorldKey(): string {
  if (typeof document === 'undefined') return 'default';
  return document.documentElement.getAttribute(KEY) || 'default';
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [KEY] });
  return () => observer.disconnect();
}

export function useWorldKey(): string {
  return useSyncExternalStore(subscribe, getWorldKey, () => 'default');
}
