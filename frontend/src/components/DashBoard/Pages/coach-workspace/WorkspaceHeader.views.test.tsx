/**
 * Chat · Today · Floor is one click from anywhere (Sean, 2026-09-23: "I could just
 * click it and just choose floor mode"). Floor goes through startFloor so a pinned
 * client carries over by ID; the Context toggle hides where it has nothing to open.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceHeader from './WorkspaceHeader';

function mount(view: string) {
  const model = {
    view, isClientMode: false, scopeLabel: 'Avery Stone', reviewTotal: 0,
    controller: { commandBusy: false, selectionPhase: 'ready', chatLoading: false, activeThread: null, drawer: null, openDrawer: vi.fn() },
    catalog: { failed: false },
    panels: { docking: { sidebarDocked: true }, sidebarVisible: false, inspectorVisible: true, toggleSidebar: vi.fn(), toggleInspector: vi.fn() },
    showView: vi.fn(), startFloor: vi.fn(), backToChat: vi.fn(), openReview: vi.fn(),
  };
  render(<WorkspaceHeader model={model as never} />);
  return model;
}

describe('the view switch', () => {
  it('Floor is one click and goes through startFloor; Today and Chat switch views', () => {
    const model = mount('chat');
    const nav = screen.getByRole('navigation', { name: 'Coach view' });
    expect(screen.getByRole('button', { name: 'Chat' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Floor' }));
    expect(model.startFloor).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(model.showView).toHaveBeenCalledWith('today');
    expect(nav).toBeInTheDocument();
  });

  it('on Floor the title names the session and the Context toggle is gone', () => {
    mount('floor');
    expect(screen.getByRole('button', { name: 'Floor' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Floor · Avery Stone')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Context and schedule' })).not.toBeInTheDocument();
  });

  it('CONTROL: in Chat the Context toggle is still there', () => {
    mount('chat');
    expect(screen.getByRole('button', { name: 'Context and schedule' })).toBeInTheDocument();
  });
});
