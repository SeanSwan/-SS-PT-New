/**
 * FILE: CoachCommandCenterPage.deskMount.test.tsx
 * PURPOSE: G04c — Session Desk page-shell mount (S6, doc 14/31/38).
 *          The talk lane mounts the Session Desk behind the staff role gate:
 *          admin/trainer (not client mode) render the desk gate + desk with an
 *          empty-state CTA and the surface identity; client mode keeps the legacy
 *          transcript as the only surface. The desk consumes the G04a shell-owned
 *          draft provider (mirrored in the harness) — no parallel store.
 */
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage, resetCoachCommandCenterMocks, setCoachCommandCenterRole } from './CoachCommandCenterPage.test.harness';

const COACH_COMMAND_CENTER_TEST_TIMEOUT = 15000;

describe('CoachCommandCenterPage session desk mount', () => {
  beforeEach(resetCoachCommandCenterMocks);
  afterEach(cleanup);

  it('mounts the Session Desk (empty state) for staff roles on the talk surface', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat', 'admin');
    // Staff mode: the gate enables the desk; the desk reports its empty state.
    const desk = document.querySelector('[data-testid="coach-session-desk"]');
    expect(desk).toBeTruthy();
    expect(desk?.getAttribute('data-desk-state')).toBe('empty');
    // The desk is issued a surface token from the surface provider (desk gate).
    expect(desk?.getAttribute('data-surface-token')).toBeTruthy();
    // The empty-state CTA actions are present on the talk surface.
    expect(screen.getByTestId('coach-session-desk-log')).toBeInTheDocument();
    expect(screen.getByTestId('coach-session-desk-ask')).toBeInTheDocument();
    // The legacy transcript remains alongside the desk (no removal of existing surface).
    expect(screen.getByText(/Talk to Swan Coach/i)).toBeInTheDocument();
  }, COACH_COMMAND_CENTER_TEST_TIMEOUT);

  it('mounts the desk for trainer staff role as well', () => {
    setCoachCommandCenterRole('trainer');
    renderPage('/dashboard/trainer/coach-assistant?workspace=chat', 'trainer');
    const desk = document.querySelector('[data-testid="coach-session-desk"]');
    expect(desk).toBeTruthy();
    expect(desk?.getAttribute('data-desk-state')).toBe('empty');
  }, COACH_COMMAND_CENTER_TEST_TIMEOUT);

  it('does not mount the desk in client mode (legacy transcript remains the only surface)', () => {
    renderPage('/dashboard/client/coach-assistant?workspace=chat', 'client');
    expect(document.querySelector('[data-testid="coach-session-desk"]')).toBeNull();
    expect(document.querySelector('[data-testid="coach-session-desk-empty"]')).toBeNull();
    expect(screen.queryByTestId('coach-session-desk-log')).toBeNull();
    // Client mode still has the transcript surface.
    expect(screen.getByText(/Talk to Swan Coach/i)).toBeInTheDocument();
  }, COACH_COMMAND_CENTER_TEST_TIMEOUT);
});
