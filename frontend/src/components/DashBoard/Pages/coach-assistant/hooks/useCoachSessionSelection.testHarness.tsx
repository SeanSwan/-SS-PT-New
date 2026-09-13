/**
 * ============================================================================
 * FILE: useCoachSessionSelection.testHarness.tsx
 * PURPOSE: Shared fixture for the C2 adapter tests (plan 55 §3 C2 / plan 63 §6).
 * ============================================================================
 * The plan 51 owner (`CoachSessionDraftProvider`) and the plan 61 provider
 * (`GlobalClientProvider`) are REAL here. Only authentication, the authorised
 * roster HTTP and the plan 52 `target-access` HTTP are mocked.
 *
 * This module deliberately contains no `it(...)` — it is a fixture, split out so
 * both C2 test files stay inside the Rule 4 cap without losing assertions.
 */
import { act, render } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { GlobalClientProvider, useGlobalClient } from '../../../../../context/GlobalClientContext';
import { CoachSessionDraftProvider, useCoachSessionDraftContext } from '../CoachSessionDraftContext';
import {
  useCoachSessionSelection,
  type CoachSelectionAdapterParams,
  type CoachSelectionObservation,
} from './useCoachSessionSelection';

// `vi.hoisted` values cannot be exported inline; they are re-exported below.
const rosterGetMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const authHolder = vi.hoisted(() => ({
  user: { id: 7, role: 'trainer' } as { id: number; role: string } | null,
}));

export { rosterGetMock, apiGetMock, authHolder };

vi.mock('../../../../../services/api.service', () => ({
  default: { get: apiGetMock, post: vi.fn() },
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: authHolder.user,
    authAxios: { get: rosterGetMock },
    isAuthenticated: Boolean(authHolder.user),
  }),
  default: {},
}));

export type Adapter = ReturnType<typeof useCoachSessionSelection>;
export type Owner = ReturnType<typeof useCoachSessionDraftContext>;
export type Reference = ReturnType<typeof useGlobalClient>;

/** The live handles of the most recent render. */
export const sel: { adapter: Adapter | null; owner: Owner | null; reference: Reference | null } = {
  adapter: null, owner: null, reference: null,
};

function Probe(props: Omit<CoachSelectionAdapterParams, 'audienceRole'>) {
  sel.adapter = useCoachSessionSelection(props);
  sel.owner = useCoachSessionDraftContext();
  sel.reference = useGlobalClient();
  return null;
}

export const OBSERVATION: CoachSelectionObservation = {
  pathname: '/dashboard/admin/coach-assistant',
  search: '?clientId=42',
  hash: '',
};

export type ProbeProps = { actorId: number | null; rawRole: string; observation: CoachSelectionObservation | null };

function probeTree(props: ProbeProps) {
  return (
    <GlobalClientProvider>
      <CoachSessionDraftProvider actorId={props.actorId} actorRole={props.rawRole}>
        <Probe actorId={props.actorId} rawRole={props.rawRole} observation={props.observation} />
      </CoachSessionDraftProvider>
    </GlobalClientProvider>
  );
}

export function probeElement(props: ProbeProps) {
  return probeTree(props);
}

export function renderProbe(actorId: number | null = 7, rawRole: string = 'trainer', observation: CoachSelectionObservation | null = OBSERVATION) {
  return render(probeTree({ actorId, rawRole, observation }));
}

/** A plan 52 receipt exactly as the backend produces it. */
export function receipt(overrides: Record<string, unknown> = {}, targetUserId: number | null = 42, conversationId: number | null = null) {
  return {
    data: {
      success: true,
      access: {
        scope: 'coach_target_read', actorUserId: 7, actorRole: 'trainer',
        targetUserId, conversationId, ...overrides,
      },
    },
  };
}

export function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

/** Seed a DIRTY plan 51 draft for `target` under the current actor. */
export function seedDirtyDraft(target = 42): string {
  let scopeToken = '';
  act(() => { scopeToken = sel.owner!.begin(target, 'workout') ?? ''; });
  act(() => { sel.owner!.edit(scopeToken, 0, { content: { title: 'Private synthetic draft' } }); });
  return scopeToken;
}

beforeEach(() => {
  sel.adapter = null; sel.owner = null; sel.reference = null;
  authHolder.user = { id: 7, role: 'trainer' };
  rosterGetMock.mockReset();
  rosterGetMock.mockResolvedValue({ data: { clients: [] } });
  apiGetMock.mockReset();
  // The DEFAULT transport echoes the requested target/thread, exactly as the
  // real plan 52 endpoint does. A test that needs a mismatch overrides it.
  apiGetMock.mockImplementation(async (_url: string, config?: { params?: Record<string, string> }) => {
    const requested = config?.params?.targetUserId;
    const thread = config?.params?.conversationId;
    return receipt(
      {},
      requested === undefined ? null : Number(requested),
      thread === undefined ? null : Number(thread),
    );
  });
  window.sessionStorage.clear();
});
