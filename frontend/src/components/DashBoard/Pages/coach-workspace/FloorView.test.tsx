/**
 * Floor is keyed by client: switching the @ client remounts the live session, so
 * one client's plan or sets can never be carried into another client's session.
 * And it opens only for the client the chat's admission ACCEPTED (Astra F2):
 * checking or refused → no live session, so nothing stored on this device shows.
 */
import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FloorView from './FloorView';
import { localDateISO } from './floorSession';

const mounts = vi.hoisted(() => [] as number[]);
vi.mock('./FloorLive', () => ({
  default: ({ clientId, who, link }: { clientId: number; who: string; link: { scheduledSessionId: string } | null }) => {
    useEffect(() => { mounts.push(clientId); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount only
    return <p>live {clientId} {who}{link ? ` booked ${link.scheduledSessionId}` : ''}</p>;
  },
}));
vi.mock('./WorkspaceComposer', () => ({ default: () => <p>composer</p> }));

const model = (selectedClientId: number | null, scopeLabel: string, admission: { phase: string; accepted: number | null } = { phase: 'ready', accepted: selectedClientId }, floorLink: unknown = null) => ({
  isClientMode: false, user: { id: 1, role: 'trainer' }, scopeLabel, showView: vi.fn(), floorLink,
  controller: {
    clientPin: { selectedClientId },
    selectionPhase: admission.phase,
    selection: { phase: admission.phase, accepted: admission.accepted === null ? null : { targetUserId: admission.accepted } },
  },
});

describe('FloorView', () => {
  it('a client switch is a fresh session (remount), not a carry-over', () => {
    const view = render(<FloorView model={model(12, 'Avery Stone') as never} />);
    expect(screen.getByText('live 12 Avery Stone')).toBeInTheDocument();
    view.rerender(<FloorView model={model(12, 'Avery Stone') as never} />);
    view.rerender(<FloorView model={model(7, 'Maria Rios') as never} />);
    expect(screen.getByText('live 7 Maria Rios')).toBeInTheDocument();
    expect(mounts).toEqual([12, 7]); // same client → no remount; new client → new mount
  });

  it('opens only for the ACCEPTED client: checking, refused, or another target never mounts the live session', () => {
    mounts.length = 0;
    const view = render(<FloorView model={model(12, 'Avery Stone', { phase: 'checking', accepted: null }) as never} />);
    expect(screen.getByRole('heading', { name: 'Checking access…' })).toBeInTheDocument();
    view.rerender(<FloorView model={model(12, 'Avery Stone', { phase: 'ready', accepted: 7 }) as never} />); // admitted, but someone else
    expect(screen.getByRole('heading', { name: 'Checking access…' })).toBeInTheDocument();
    view.rerender(<FloorView model={model(12, 'Avery Stone', { phase: 'denied', accepted: null }) as never} />);
    expect(screen.getByRole('heading', { name: 'Floor is closed for this client' })).toBeInTheDocument();
    expect(screen.getByText('composer')).toBeInTheDocument(); // @ another client from here
    expect(mounts).toEqual([]);
    view.rerender(<FloorView model={model(12, 'Avery Stone') as never} />);
    expect(screen.getByText('live 12 Avery Stone')).toBeInTheDocument(); // access returned → the stored session opens
  });

  it("a booking from Today reaches only that client's Floor", () => {
    const link = { clientId: 12, link: { scheduledSessionId: '501', date: localDateISO(), startsAt: new Date().toISOString() } };
    const view = render(<FloorView model={model(12, 'Avery Stone', undefined, link) as never} />);
    expect(screen.getByText('live 12 Avery Stone booked 501')).toBeInTheDocument();
    view.rerender(<FloorView model={model(7, 'Maria Rios', undefined, link) as never} />);
    expect(screen.getByText('live 7 Maria Rios')).toBeInTheDocument();
  });

  it("a booking from another day is stale and never reaches Floor", () => {
    const stale = { clientId: 12, link: { scheduledSessionId: '400', date: '2020-01-01', startsAt: '2020-01-01T16:00:00.000Z' } };
    render(<FloorView model={model(12, 'Avery Stone', undefined, stale) as never} />);
    expect(screen.getByText('live 12 Avery Stone')).toBeInTheDocument(); // no "booked 400"
  });

  it('no client pinned → who are you training, with the composer kept', () => {
    render(<FloorView model={model(null, '') as never} />);
    expect(screen.getByRole('heading', { name: 'Who are you training?' })).toBeInTheDocument();
    expect(screen.getByText('composer')).toBeInTheDocument();
  });
});
