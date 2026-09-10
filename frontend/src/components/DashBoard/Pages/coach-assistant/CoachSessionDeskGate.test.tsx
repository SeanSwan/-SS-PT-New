/**
 * FILE: CoachSessionDeskGate.test.tsx
 * PURPOSE: G04c — Session Desk feature gate.
 *          The desk renders only while `enabled`; when disabled nothing from the desk
 *          subtree mounts (legacy transcript stays the only surface). The gate wraps the
 *          desk in the surface provider so the desk's surface token is present.
 *
 *          The provider fake below mirrors the real module's stableToken derivation
 *          (surfaceKey||routeKey + target + generation) and exposes the issued identity
 *          as a data attribute so the desk's data-surface-token can be asserted against it.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import CoachSessionDeskGate from './CoachSessionDeskGate';
import type { CoachSessionDraft, DraftState, SubmittedDraft } from './coachSessionDraftState';

interface GateSurfaceValue {
  routeKey: string;
  surfaceKey: string;
  targetUserId: number | null;
  selectedEntityIds: ReadonlyArray<string>;
  generation: number;
  surfaceToken: string;
  deskReady: boolean;
}

const draftApiState = vi.hoisted(() => ({
  current: {
    actorId: 7 as number | null,
    actorRole: 'trainer' as string | null,
    generation: 2,
    draft: null as CoachSessionDraft | null,
    submitted: null as SubmittedDraft | null,
    pendingTargetChange: null as DraftState['pendingTargetChange'],
    begin: vi.fn(),
    edit: vi.fn(),
    freezeForSubmit: vi.fn(),
    resolveTargetChange: vi.fn(),
    discard: vi.fn(),
  },
}));

const providerToken = vi.hoisted(() => ({ current: '' as string }));

const gateSurfaceContext = React.createContext<GateSurfaceValue>({
  routeKey: '',
  surfaceKey: 'unknown',
  targetUserId: null,
  selectedEntityIds: [],
  generation: 0,
  surfaceToken: 'unknown',
  deskReady: false,
});

const submitState = vi.hoisted(() => ({
  current: {
    submitting: false,
    error: null as { message: string } | null,
    lastResponse: null as { success: boolean; intentId?: string } | null,
    submit: vi.fn(),
  },
}));

vi.mock('./useCoachSessionDraft', () => ({
  useCoachSessionDraft: () => draftApiState.current,
}));

vi.mock('./useCoachSurfaceContext', () => {
  const stableToken = (routeKey: string, surfaceKey: string, targetUserId: number | null, generation: number) =>
    [surfaceKey || routeKey || 'unknown', targetUserId ?? 'no-target', generation].join(':');

  const FakeProvider = (props: { routeKey?: string; surfaceKey?: string; targetUserId?: number | null; children?: React.ReactNode }) => {
    const routeKey = props.routeKey ?? '';
    const surfaceKey = props.surfaceKey ?? '';
    const targetUserId = props.targetUserId ?? null;
    const token = stableToken(routeKey, surfaceKey, targetUserId, draftApiState.current.generation);
    providerToken.current = token;
    const value: GateSurfaceValue = {
      routeKey,
      surfaceKey: surfaceKey || routeKey || 'unknown',
      targetUserId,
      selectedEntityIds: [],
      generation: draftApiState.current.generation,
      surfaceToken: token,
      deskReady: draftApiState.current.actorId !== null,
    };
    return React.createElement(
      'div',
      { 'data-testid': 'coach-surface-provider', 'data-surface-token': token },
      React.createElement(gateSurfaceContext.Provider, { value }, props.children),
    );
  };

  return {
    CoachSurfaceProvider: FakeProvider,
    useCoachSurfaceContext: () => React.useContext(gateSurfaceContext),
  };
});

vi.mock('./useCoachWorkoutDraftSubmit', () => ({
  useCoachWorkoutDraftSubmit: () => submitState.current,
}));

beforeEach(() => {
  Object.assign(draftApiState.current, {
    actorId: 7,
    actorRole: 'trainer',
    generation: 2,
    draft: null,
    submitted: null,
    pendingTargetChange: null,
  });
  providerToken.current = '';
  Object.assign(submitState.current, { submitting: false, error: null, lastResponse: null });
});

afterEach(cleanup);

describe('G04c session desk gate', () => {
  it('mounts the desk inside the surface provider when enabled', () => {
    render(<CoachSessionDeskGate enabled targetUserId={42} onOpenLogger={() => undefined} />);
    const provider = screen.getByTestId('coach-surface-provider');
    expect(provider.getAttribute('data-surface-token')).toBe('coach-session-desk:42:2');
    const desk = document.querySelector('[data-testid="coach-session-desk"]');
    expect(desk).toBeTruthy();
    // The desk reads the surface token the gate's provider issued.
    expect(desk?.getAttribute('data-surface-token')).toBe(providerToken.current);
  });

  it('renders nothing (legacy transcript remains the surface) when disabled', () => {
    const { container } = render(<CoachSessionDeskGate enabled={false} onOpenLogger={() => undefined} />);
    expect(container.querySelector('[data-testid="coach-session-desk"]')).toBeNull();
    expect(container.querySelector('[data-testid="coach-session-desk-empty"]')).toBeNull();
    expect(container.querySelector('[data-testid="coach-surface-provider"]')).toBeNull();
  });

  it('derives the surface token from the gate-issued targetUserId', () => {
    render(<CoachSessionDeskGate enabled targetUserId={77} onOpenLogger={() => undefined} />);
    const desk = document.querySelector('[data-testid="coach-session-desk"]');
    expect(desk).toBeTruthy();
    expect(providerToken.current).toBe('coach-session-desk:77:2');
    expect(desk?.getAttribute('data-surface-token')).toBe('coach-session-desk:77:2');
  });
});
