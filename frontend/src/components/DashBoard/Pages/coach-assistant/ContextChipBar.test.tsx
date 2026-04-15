/**
 * ContextChipBar — informational taxonomy behavior test
 * =====================================================
 * Phase 9.1 hotfix 2026-04-14: ContextChipBar was redesigned from a row
 * of interactive context-switching buttons into an informational
 * capability taxonomy. This test locks the non-interactive contract:
 *
 *   - no <button> elements rendered
 *   - no role="toolbar" or aria-pressed
 *   - no click handler attached
 *   - each item uses list semantics (li) not button semantics
 *   - section has an accessible informational label
 *
 * Complements the source-level locks in
 * SwanCoachAssistantPage.transcriptIntake.test.ts Phase 9.1 section.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContextChipBar } from './ContextChipBar';

describe('ContextChipBar — informational taxonomy', () => {
  it('renders zero button elements', () => {
    const { container } = render(<ContextChipBar userRole="admin" />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('renders zero role="toolbar" or role="button" ancestors for the items', () => {
    const { container } = render(<ContextChipBar userRole="admin" />);
    expect(container.querySelector('[role="toolbar"]')).toBeNull();
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(container.querySelector('[aria-pressed]')).toBeNull();
  });

  it('renders a section with an accessible capability label', () => {
    render(<ContextChipBar userRole="admin" />);
    expect(screen.getByText(/What Swan Coach Can Help With/i)).toBeInTheDocument();
  });

  it('renders items as list elements, not buttons', () => {
    const { container } = render(<ContextChipBar userRole="admin" />);
    // At least one <ul> element (the info list)
    const lists = container.querySelectorAll('ul');
    expect(lists.length).toBeGreaterThanOrEqual(1);
    // Multiple <li> capability items for admin
    const items = container.querySelectorAll('li');
    expect(items.length).toBeGreaterThan(0);
  });

  it('shows admin capabilities', () => {
    render(<ContextChipBar userRole="admin" />);
    // Admin should see the full taxonomy
    expect(screen.getByText('Coach')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('XP & Badges')).toBeInTheDocument();
  });

  it('filters to client-visible capabilities only for client role', () => {
    render(<ContextChipBar userRole="client" />);
    // Clients should NOT see admin-only items like "XP & Badges"
    expect(screen.queryByText('XP & Badges')).not.toBeInTheDocument();
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    // But should see the ones marked for all roles
    expect(screen.getByText('Log Meal')).toBeInTheDocument();
    expect(screen.getByText('Form Tips')).toBeInTheDocument();
  });

  it('does not accept or respond to onContextChange/activeContext props', () => {
    // TypeScript guards this at compile time, but we also verify at runtime
    // that passing these props does not cause an error or side effect. The
    // props are ignored because the component interface no longer accepts
    // them. (This test uses `as any` on purpose — if the props are re-added
    // by accident, the test still passes, but the source-level lock in
    // SwanCoachAssistantPage.transcriptIntake.test.ts will fail.)
    const noop = () => {};
    const { container } = render(
      // @ts-expect-error — props deliberately removed in Phase 9.1
      <ContextChipBar userRole="admin" activeContext="coach_assistant" onContextChange={noop} />,
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });
});
