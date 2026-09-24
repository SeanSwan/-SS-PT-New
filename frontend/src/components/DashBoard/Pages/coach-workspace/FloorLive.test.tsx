/**
 * FloorLive says what the save will do BEFORE the tap, never promising an
 * exemption the save may not carry, and takes Today's booking into its own
 * session so the page cannot re-attach a used or stale one later.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FloorLive from './FloorLive';
import { localDateISO } from './floorSession';

vi.mock('../../../UniversalMasterSchedule/useSessionPlannedWorkout', () => ({ useSessionPlannedWorkout: () => ({ status: 'none' }) }));
vi.mock('../../../../services/nasmApiService', () => ({ dailyWorkoutFormService: { submitWorkoutForm: vi.fn() } }));
vi.mock('../../../../utils/workoutLoggedEvent', () => ({ dispatchWorkoutLogged: vi.fn() }));
vi.mock('./WorkspaceComposer', () => ({ default: () => <p>composer</p> }));
vi.mock('./TurnEntry', () => ({ default: () => null, turnKind: () => 'coach' }));
vi.mock('../coach-assistant/coachClientNames', () => ({ useCoachClientNames: () => new Map(), nameClientTokens: (text: string) => text }));

const model = () => ({
  user: { id: 1, role: 'trainer' }, floorSetSink: { current: null }, workoutLoggerRoute: '/logger', loggerScopeLabel: 'Avery',
  consumeFloorLink: vi.fn(),
  controller: { commandText: '', logs: [], setCommandText: vi.fn() },
});

function logOneSet() {
  fireEvent.change(screen.getByLabelText('Add an exercise'), { target: { value: 'Box squat' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.click(screen.getByRole('button', { name: 'One more rep' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save set 1' }));
}

beforeEach(() => window.sessionStorage.clear());

describe('FloorLive', () => {
  it("a booked session: names the booking's rule and hands the booking over once", () => {
    const m = model();
    const link = { scheduledSessionId: '501', date: localDateISO(), startsAt: new Date().toISOString() };
    render(<MemoryRouter><FloorLive model={m as never} clientId={12} who="Avery S." link={link} /></MemoryRouter>);
    expect(m.consumeFloorLink).toHaveBeenCalledTimes(1);
    logOneSet();
    expect(screen.getByText(/^Completes the .* session\. A credit already taken for it is not taken again; otherwise its session type’s credits are used\.$/)).toBeInTheDocument();
  });

  it('an unbooked session: says a credit MAY be used and that the receipt will say exactly — no exemption promised', () => {
    const m = model();
    render(<MemoryRouter><FloorLive model={m as never} clientId={12} who="Avery S." link={null} /></MemoryRouter>);
    expect(m.consumeFloorLink).not.toHaveBeenCalled();
    expect(screen.queryByText(/session credit/)).not.toBeInTheDocument(); // nothing to save yet, nothing to warn about
    logOneSet();
    const line = screen.getByText(/Not tied to a booked session/);
    expect(line).toHaveTextContent('may use a session credit. The saved message says exactly what was charged.');
    expect(line).not.toHaveTextContent(/homework/);
  });
});
