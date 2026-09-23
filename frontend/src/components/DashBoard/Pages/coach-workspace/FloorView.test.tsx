/**
 * Floor is keyed by client: switching the @ client remounts the live session, so
 * one client's plan or sets can never be carried into another client's session.
 */
import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FloorView from './FloorView';

const mounts = vi.hoisted(() => [] as number[]);
vi.mock('./FloorLive', () => ({
  default: ({ clientId, who }: { clientId: number; who: string }) => {
    useEffect(() => { mounts.push(clientId); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount only
    return <p>live {clientId} {who}</p>;
  },
}));
vi.mock('./WorkspaceComposer', () => ({ default: () => <p>composer</p> }));

const model = (selectedClientId: number | null, scopeLabel: string) => ({
  isClientMode: false, user: { id: 1, role: 'trainer' }, scopeLabel, showView: vi.fn(),
  controller: { clientPin: { selectedClientId } },
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

  it('no client pinned → who are you training, with the composer kept', () => {
    render(<FloorView model={model(null, '') as never} />);
    expect(screen.getByRole('heading', { name: 'Who are you training?' })).toBeInTheDocument();
    expect(screen.getByText('composer')).toBeInTheDocument();
  });
});
