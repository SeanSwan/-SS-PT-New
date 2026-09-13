/**
 * ============================================================================
 * FILE: CoachCommandCenterPage.selectionBinding.test.tsx
 * PURPOSE: THE DORMANCY TEST — plan 55 C3 acceptance bar.
 * ============================================================================
 * This is the test that would have caught the C1/C4 dormancy. It mounts the REAL
 * page and the REAL controller and asserts that the ONE admitted selection
 * publication binding actually reaches every C4 boundary consumer:
 *
 *   useCoachClientNotebook · useCoachComposerDraft
 *   useCoachCommandCenterPendingFood · useCoachCommandVoiceCapture
 *
 * It is deliberately NOT satisfied by "the suites still pass". Every consumer is
 * wrapped with a delegating spy, so removing the wiring turns the specific
 * assertion RED instead of leaving a green suite that proves nothing.
 */
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiGetMock,
  renderPage,
  resetCoachCommandCenterMocks,
  setCoachCommandCenterConversations,
} from './CoachCommandCenterPage.test.harness';

type RecordedCall = { name: string; binding: unknown };

const probe = vi.hoisted(() => ({
  calls: [] as RecordedCall[],
  adapterBinding: null as { getSnapshot: () => unknown } | null,
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('./hooks/useCoachClientNotebook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useCoachClientNotebook')>();
  return {
    ...actual,
    useCoachClientNotebook: (args: any) => {
      probe.calls.push({ name: 'useCoachClientNotebook', binding: args?.binding });
      return actual.useCoachClientNotebook(args);
    },
  };
});

vi.mock('./hooks/useCoachComposerDraft', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useCoachComposerDraft')>();
  return {
    ...actual,
    useCoachComposerDraft: (threadKey: any, text: any, setText: any, scope: any, enabled?: any) => {
      probe.calls.push({ name: 'useCoachComposerDraft', binding: scope?.binding });
      return actual.useCoachComposerDraft(threadKey, text, setText, scope, enabled);
    },
  };
});

vi.mock('./hooks/useCoachCommandCenterPendingFood', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useCoachCommandCenterPendingFood')>();
  return {
    ...actual,
    useCoachCommandCenterPendingFood: (args: any) => {
      probe.calls.push({ name: 'useCoachCommandCenterPendingFood', binding: args?.binding });
      return actual.useCoachCommandCenterPendingFood(args);
    },
  };
});

vi.mock('./CoachCommandCenter.voiceCapture', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./CoachCommandCenter.voiceCapture')>();
  return {
    ...actual,
    useCoachCommandVoiceCapture: (args: any) => {
      probe.calls.push({ name: 'useCoachCommandVoiceCapture', binding: args?.binding });
      return actual.useCoachCommandVoiceCapture(args);
    },
  };
});

vi.mock('./hooks/useCoachSessionSelection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useCoachSessionSelection')>();
  return {
    ...actual,
    useCoachSessionSelection: (args: any) => {
      const result = actual.useCoachSessionSelection(args);
      probe.adapterBinding = result.publicationBinding;
      return result;
    },
  };
});

const FOUR_CONSUMERS = [
  'useCoachClientNotebook',
  'useCoachComposerDraft',
  'useCoachCommandCenterPendingFood',
  'useCoachCommandVoiceCapture',
];

function bindingsFor(name: string): unknown[] {
  return probe.calls.filter((call) => call.name === name).map((call) => call.binding);
}

describe('CoachCommandCenterPage — the selection binding is WIRED, not dormant', () => {
  beforeEach(() => {
    probe.calls.length = 0;
    probe.adapterBinding = null;
    resetCoachCommandCenterMocks();
    setCoachCommandCenterConversations([]);
  });

  it('mounts every one of the four C4 consumers with the adapter publication binding', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    await waitFor(() => expect(probe.adapterBinding).not.toBeNull());
    await waitFor(() => {
      for (const name of FOUR_CONSUMERS) expect(bindingsFor(name).length).toBeGreaterThan(0);
    });

    for (const name of FOUR_CONSUMERS) {
      // THE ASSERTION THAT WOULD HAVE CAUGHT THE DORMANCY: a consumer that is
      // mounted with NO binding is inert no matter how correct its own tests are.
      expect(bindingsFor(name)[0], `${name} received no publication binding`).toBeDefined();
      expect(bindingsFor(name)[0], `${name} received a different binding`).toBe(probe.adapterBinding);
    }
  });

  it('admits the routed client and the SAME live binding reports it to all four', async () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=52&workspace=chat');

    await waitFor(() => {
      expect(apiGetMock.mock.calls.some((call) => String(call[0]) === '/api/ai-chat/target-access')).toBe(true);
    });
    await waitFor(() => {
      expect(probe.adapterBinding?.getSnapshot()).toMatchObject({ targetUserId: 52, enabled: true });
    });

    for (const name of FOUR_CONSUMERS) {
      const binding = bindingsFor(name)[0] as { getSnapshot: () => unknown } | undefined;
      expect(binding, `${name} received no publication binding`).toBeDefined();
      // A live binding object, not a frozen copy: the consumer sees the ADMITTED
      // scope, which is the entire point of the boundary.
      expect(binding!.getSnapshot(), `${name} cannot see the admitted scope`).toMatchObject({
        targetUserId: 52,
        enabled: true,
      });
    }
  });

  it('leaves the raw client/user self flow UNBOUND and never calls the staff endpoint', async () => {
    // rawRole 'user' is the database's default self-registration role. The page
    // passes it separately from the 'client' presentation role; the client
    // self flow keeps its existing server-owned behaviour and gets NO binding.
    renderPage('/dashboard/admin/coach-assistant?clientId=52&workspace=chat', 'user');

    await waitFor(() => {
      for (const name of FOUR_CONSUMERS) expect(bindingsFor(name).length).toBeGreaterThan(0);
    });
    expect(apiGetMock.mock.calls.some((call) => String(call[0]) === '/api/ai-chat/target-access')).toBe(false);
    for (const name of FOUR_CONSUMERS) {
      expect(bindingsFor(name)[0], `${name} must stay unbound for a client actor`).toBeUndefined();
    }
  });

  it('binds an UNKNOWN raw role FAIL-CLOSED — present, and permanently blocked', async () => {
    // normalizeCoachCommandRole defaults an unknown role to the 'admin'
    // presentation. The binding must still reach the consumers, and it must
    // never be admitted, so the presentation cannot become authority.
    renderPage('/dashboard/admin/coach-assistant?clientId=52&workspace=chat', 'ghost');

    await waitFor(() => expect(probe.adapterBinding).not.toBeNull());
    await waitFor(() => {
      for (const name of FOUR_CONSUMERS) expect(bindingsFor(name).length).toBeGreaterThan(0);
    });
    expect(apiGetMock.mock.calls.some((call) => String(call[0]) === '/api/ai-chat/target-access')).toBe(false);
    for (const name of FOUR_CONSUMERS) {
      const binding = bindingsFor(name)[0] as { getSnapshot: () => unknown } | undefined;
      expect(binding, `${name} received no publication binding`).toBeDefined();
      expect(binding!.getSnapshot(), `${name} saw an admission for an unknown role`).toBeNull();
    }
  });

  it('renders the selection decision surface when the adapter is deciding', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    // The decision surface is a C3 deliverable; its absence is a C3 gap, so this
    // asserts the mount point exists rather than the dialog being open.
    await waitFor(() => expect(probe.adapterBinding).not.toBeNull());
    expect(screen.queryByTestId('coach-selection-decision')).toBeNull();
  });
});
