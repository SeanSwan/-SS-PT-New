/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SavedPlanCard, { SavedPlanSummary } from './SavedPlanCard';
import React from 'react';

// ─────────────────────────────────────────────────────────────
// Plan Library slice (REV 2 receipt §7.2). Locks the stopPropagation
// matrix so card-action buttons NEVER trigger card-body Load.
// ─────────────────────────────────────────────────────────────

const draftPlan: SavedPlanSummary = {
  id: 'p-50',
  name: 'Phase 1 Plan',
  status: 'draft',
  createdAt: '2026-04-30T00:00:00Z',
  goal: 'general_fitness',
};

const activePlan: SavedPlanSummary = {
  id: 'p-51',
  name: 'Phase 2 Plan',
  status: 'active',
  createdAt: '2026-05-01T00:00:00Z',
  goal: 'hypertrophy',
};

const handlers = () => ({
  onLoad: vi.fn(),
  onActivate: vi.fn(),
  onRename: vi.fn(),
  onDuplicate: vi.fn(),
  onArchive: vi.fn(),
});

beforeEach(() => {
  cleanup();
});

describe('SavedPlanCard — basic render', () => {
  it('renders plan name and goal', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    expect(screen.getByText('Phase 1 Plan')).toBeInTheDocument();
    expect(screen.getByText(/general fitness/i)).toBeInTheDocument();
  });

  it('renders "Current" badge for active plan, status text for others', () => {
    const h = handlers();
    const { rerender } = render(<SavedPlanCard plan={activePlan} loaded={false} archiveBlocked={false} {...h} />);
    expect(screen.getByTestId('current-badge')).toHaveTextContent(/current/i);

    rerender(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    expect(screen.getByTestId('status-badge-draft')).toHaveTextContent(/draft/i);
  });

  it('hides "Make Current" button on the active plan card', () => {
    const h = handlers();
    render(<SavedPlanCard plan={activePlan} loaded={false} archiveBlocked={false} {...h} />);
    expect(screen.queryByTestId('action-activate-p-51')).not.toBeInTheDocument();
  });

  it('shows "Make Current" button on non-active plan cards', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    expect(screen.getByTestId('action-activate-p-50')).toBeInTheDocument();
  });
});

describe('SavedPlanCard — card-body Load', () => {
  it('clicking the card body calls onLoad with plan id and name', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('saved-plan-card-p-50'));
    expect(h.onLoad).toHaveBeenCalledTimes(1);
    expect(h.onLoad).toHaveBeenCalledWith('p-50', 'Phase 1 Plan');
  });

  it('Enter key on card body calls onLoad', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    const card = screen.getByTestId('saved-plan-card-p-50');
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(h.onLoad).toHaveBeenCalledTimes(1);
  });

  it('Space key on card body calls onLoad', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    const card = screen.getByTestId('saved-plan-card-p-50');
    fireEvent.keyDown(card, { key: ' ' });
    expect(h.onLoad).toHaveBeenCalledTimes(1);
  });
});

describe('SavedPlanCard — stopPropagation matrix (Codex correction #4)', () => {
  it('clicking Activate button does NOT trigger Load', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-activate-p-50'));
    expect(h.onActivate).toHaveBeenCalledTimes(1);
    expect(h.onLoad).not.toHaveBeenCalled();
  });

  it('clicking Rename button does NOT trigger Load (and enters rename mode)', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-rename-p-50'));
    expect(h.onLoad).not.toHaveBeenCalled();
    // Rename mode is now active
    expect(screen.getByTestId('rename-input-p-50')).toBeInTheDocument();
    expect(screen.getByTestId('rename-save-p-50')).toBeInTheDocument();
  });

  it('clicking Duplicate button does NOT trigger Load', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-duplicate-p-50'));
    expect(h.onDuplicate).toHaveBeenCalledTimes(1);
    expect(h.onDuplicate).toHaveBeenCalledWith('p-50', 'Phase 1 Plan');
    expect(h.onLoad).not.toHaveBeenCalled();
  });

  it('clicking Archive button does NOT trigger Load', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-archive-p-50'));
    expect(h.onArchive).toHaveBeenCalledTimes(1);
    expect(h.onLoad).not.toHaveBeenCalled();
  });
});

describe('SavedPlanCard — archive guard', () => {
  it('Archive button is disabled when archiveBlocked is true', () => {
    const h = handlers();
    render(<SavedPlanCard plan={activePlan} loaded={true} archiveBlocked={true} {...h} />);
    const btn = screen.getByTestId('action-archive-p-51');
    expect(btn).toBeDisabled();
  });

  it('clicking disabled Archive does NOT call onArchive', () => {
    const h = handlers();
    render(<SavedPlanCard plan={activePlan} loaded={true} archiveBlocked={true} {...h} />);
    fireEvent.click(screen.getByTestId('action-archive-p-51'));
    expect(h.onArchive).not.toHaveBeenCalled();
  });

  it('Archive button is enabled when archiveBlocked is false', () => {
    const h = handlers();
    render(<SavedPlanCard plan={activePlan} loaded={true} archiveBlocked={false} {...h} />);
    const btn = screen.getByTestId('action-archive-p-51');
    expect(btn).not.toBeDisabled();
  });
});

describe('SavedPlanCard — rename flow', () => {
  it('Save button calls onRename with trimmed new value, exits rename mode', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-rename-p-50'));
    const input = screen.getByTestId('rename-input-p-50') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  New Name  ' } });
    fireEvent.click(screen.getByTestId('rename-save-p-50'));
    expect(h.onRename).toHaveBeenCalledWith('p-50', 'New Name');
    expect(screen.queryByTestId('rename-input-p-50')).not.toBeInTheDocument();
  });

  it('Cancel button does NOT call onRename', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-rename-p-50'));
    fireEvent.click(screen.getByTestId('rename-cancel-p-50'));
    expect(h.onRename).not.toHaveBeenCalled();
  });

  it('Save with same name does NOT call onRename (no-op)', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-rename-p-50'));
    fireEvent.click(screen.getByTestId('rename-save-p-50'));
    expect(h.onRename).not.toHaveBeenCalled();
  });

  it('typing inside rename input does NOT trigger card Load', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);
    fireEvent.click(screen.getByTestId('action-rename-p-50'));
    const input = screen.getByTestId('rename-input-p-50');
    // Click inside the input must not bubble to the card
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Enter triggered Save, not Load
    expect(h.onLoad).not.toHaveBeenCalled();
  });
});
