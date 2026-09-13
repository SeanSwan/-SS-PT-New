/**
 * resolveSelectedClientAdvice — selected-client advice from KNOWN facts only
 * ========================================================================
 * Owner: admin-workout-planner / plannerLogic (S05, R-H22)
 *
 * THE DEFECT THIS REPLACES
 *   The chip was fed by the roster-wide resolver with every saved plan stamped
 *   as if it belonged to the currently selected client, and a failed or
 *   malformed saved-plans response was recorded as an identified EMPTY list.
 *   Together those let the chip invent a missing-plan state for a client whose
 *   plans had never been read — and then offer a one-tap action that selected
 *   that client.
 *
 * THE RULE
 *   Absence is only ever concluded from a positively identified, successfully
 *   loaded list for the SAME client. Everything else is UNKNOWN: loading, idle,
 *   error, an unrecognised roster entry, or a list whose identity belongs to a
 *   different client.
 *
 * PURITY
 *   No fetch, no clock, no roster-wide inference, no names in output — initials
 *   only, and only the selected client's. This is the whole input contract.
 */

/** Read status of the saved-plans list for the currently requested client. */
export type SavedPlansListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SelectedRosterEntry {
  id: number;
  /** Initials only. No full names cross this boundary. */
  initials: string;
}

/** A validated summary. Only ever supplied for an identified ready list. */
export interface SelectedClientPlanFact {
  active: boolean;
}

export type SelectedClientAdvice =
  | { kind: 'no-client'; copy: string; action: 'focus-picker' }
  | { kind: 'checking'; copy: string }
  | { kind: 'unavailable'; copy: string; action: 'retry' }
  | { kind: 'ready-active'; copy: string }
  | {
      kind: 'ready-empty';
      copy: string;
      clientId: number;
      action: 'offer-draft';
    };

export interface ResolveSelectedClientAdviceInput {
  selectedClientId: number | null;
  roster: readonly SelectedRosterEntry[];
  listStatus: SavedPlansListStatus;
  /** The client the current list was actually loaded FOR, or null when unknown. */
  listClientId: number | null;
  plans: readonly SelectedClientPlanFact[];
}

export const SELECTED_CLIENT_ADVICE_COPY = {
  noClient: 'Select a client',
  checking: 'Checking saved plans…',
  unavailable: 'Saved plans unavailable',
  retry: 'Retry',
  readyActive: 'Current plan available',
  noActivePlan: (initials: string) => `${initials} has no active plan`,
  draftAction: 'Draft a multi-week program',
} as const;

/**
 * Resolve the selected client's advice.
 * `unknown` (checking) is the fail-closed default: never absence.
 */
export function resolveSelectedClientAdvice({
  selectedClientId,
  roster,
  listStatus,
  listClientId,
  plans,
}: ResolveSelectedClientAdviceInput): SelectedClientAdvice {
  if (selectedClientId === null) {
    return { kind: 'no-client', copy: SELECTED_CLIENT_ADVICE_COPY.noClient, action: 'focus-picker' };
  }

  const selected = roster.find(entry => entry.id === selectedClientId);

  // An unrecognised roster entry means we know nothing about this client.
  if (!selected) {
    return { kind: 'checking', copy: SELECTED_CLIENT_ADVICE_COPY.checking };
  }

  if (listStatus === 'idle' || listStatus === 'loading') {
    return { kind: 'checking', copy: SELECTED_CLIENT_ADVICE_COPY.checking };
  }

  if (listStatus === 'error') {
    return {
      kind: 'unavailable',
      copy: SELECTED_CLIENT_ADVICE_COPY.unavailable,
      action: 'retry',
    };
  }

  // Ready, but the loaded list belongs to somebody else: still unknown.
  if (listClientId === null || listClientId !== selectedClientId) {
    return { kind: 'checking', copy: SELECTED_CLIENT_ADVICE_COPY.checking };
  }

  const activeCount = plans.reduce((count, plan) => (plan.active ? count + 1 : count), 0);

  if (activeCount > 0) {
    return { kind: 'ready-active', copy: SELECTED_CLIENT_ADVICE_COPY.readyActive };
  }

  return {
    kind: 'ready-empty',
    copy: SELECTED_CLIENT_ADVICE_COPY.noActivePlan(selected.initials),
    clientId: selected.id,
    action: 'offer-draft',
  };
}
