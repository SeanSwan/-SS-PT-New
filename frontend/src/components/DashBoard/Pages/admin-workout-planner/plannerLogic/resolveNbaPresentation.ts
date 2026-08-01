/**
 * resolveNbaPresentation (S23 — JARVIS blueprint §4.5). Pure mapper from the
 * S14 resolver's verdict to the chip COPY + TAP ACTION of the 6-row table.
 * Initials only — client names never appear in NBA copy (the resolver is
 * client-side over already-loaded data; nothing here can fetch).
 */
import type { NextBestAction } from './resolveNextBestAction';

export type NbaTapAction =
  | { kind: 'preselect_client'; clientId: number }
  | { kind: 'preselect_multi_week'; clientId: number }
  | { kind: 'open_safety_review' }
  | { kind: 'focus_client_picker' };

export interface NbaPresentation {
  copy: string;
  action: NbaTapAction;
}

export function resolveNbaPresentation(
  nba: NextBestAction,
  initialsById: ReadonlyMap<number, string>,
): NbaPresentation {
  const initials = nba.clientId !== undefined ? (initialsById.get(nba.clientId) ?? '—') : '—';
  switch (nba.kind) {
    case 'session_due':
      return { copy: `Today: ${initials} — build the next session`, action: { kind: 'preselect_client', clientId: nba.clientId! } };
    case 'deload_due':
      return { copy: `Deload week is next for ${initials}`, action: { kind: 'preselect_multi_week', clientId: nba.clientId! } };
    case 'plan_expired':
      return { copy: `${initials}'s plan ended — plan the next block`, action: { kind: 'preselect_multi_week', clientId: nba.clientId! } };
    case 'review_required':
      return { copy: '1 plan needs your review', action: { kind: 'open_safety_review' } };
    case 'missing_plan':
      return { copy: `${initials} has no active plan`, action: { kind: 'preselect_multi_week', clientId: nba.clientId! } };
    case 'pain_flag':
      return { copy: `${initials}: pain flagged last session — substitute?`, action: { kind: 'preselect_client', clientId: nba.clientId! } };
    case 'pick_client':
    default:
      return { copy: 'Pick a client to start', action: { kind: 'focus_client_picker' } };
  }
}
