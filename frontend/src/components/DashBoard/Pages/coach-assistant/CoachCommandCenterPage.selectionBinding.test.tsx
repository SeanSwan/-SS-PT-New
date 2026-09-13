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
  useAIChatMock,
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

/**
 * The C3 decision surface has to be MOUNTED, and this spy is what makes that
 * fail-able. The previous test asserted `queryByTestId(...)` was NULL — i.e. that
 * the dialog was CLOSED — so deleting `<CoachSelectionDecisionGate>` from the page
 * altogether left the whole suite green and the deliverable could vanish silently.
 * (External hostile review, GLM 5.3, Finding 5.)
 */
const decisionSpy = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));

vi.mock('./CoachSelectionDecision', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./CoachSelectionDecision')>();
  // The PAGE imports the DEFAULT export (CoachCommandCenterPage.tsx:12
  // `import CoachSelectionDecisionGate from './CoachSelectionDecision'`), so the
  // default has to be the spied binding. Mocking only the named export fires
  // never — which is exactly how the first version of this guard failed.
  // Both shapes are wrapped so either import style stays covered.
  const spy = (props: any) => {
    decisionSpy.props.push(props);
    return actual.CoachSelectionDecisionGate(props);
  };
  return { ...actual, default: spy, CoachSelectionDecisionGate: spy };
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
    decisionSpy.props.length = 0;
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

  it('MOUNTS the selection decision surface — the C3 deliverable — and can fail if it is removed', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    await waitFor(() => expect(probe.adapterBinding).not.toBeNull());
    // RED if `<CoachSelectionDecisionGate>` is deleted from the page: this spy
    // never fires. The previous version of this test asserted the dialog was
    // CLOSED, which deletion could not falsify.
    await waitFor(() => expect(decisionSpy.props.length).toBeGreaterThan(0));
    expect(decisionSpy.props[0], 'the gate was mounted without its selection port').toHaveProperty('selection');
    expect(decisionSpy.props[0], 'the gate was mounted without a current label').toHaveProperty('currentLabel');
    // No pending decision in this scenario, so the dialog itself stays closed.
    expect(screen.queryByTestId('coach-selection-decision')).toBeNull();
  });

  it('passes the SAME binding to the useAIChat transport, not only to the four consumers', async () => {
    // The dormancy had two halves: the four boundary consumers AND the three
    // transports the controller threads the binding into. The consumer spies
    // covered only the first half, so severing `binding` from useAIChat /
    // useCoachCommand / usePremiumTTS stayed green. useAIChat is already a
    // spyable mock in the harness, so it is the cheap end of that gap.
    renderPage('/dashboard/admin/coach-assistant?clientId=52&workspace=chat');
    await waitFor(() => expect(probe.adapterBinding).not.toBeNull());
    await waitFor(() => expect(useAIChatMock).toHaveBeenCalled());
    const lastCall = useAIChatMock.mock.calls.at(-1) as unknown[];
    expect(lastCall[1], 'useAIChat received no publication binding').toBe(probe.adapterBinding);
  });
});
