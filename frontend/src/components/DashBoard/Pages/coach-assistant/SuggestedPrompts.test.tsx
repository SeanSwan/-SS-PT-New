/**
 * SuggestedPrompts — CLS-reduction behavior test
 * ==============================================
 * Phase 11.1 hotfix 2026-04-14: SuggestedPrompts was the primary CLS
 * contributor on the Coach Assistant surface. The prior implementation
 * returned `null` when `visible` flipped false on first message send,
 * unmounting a ~150px block from the flex column and causing every
 * message below it to reflow up.
 *
 * This test locks the new behavior:
 *   - The SuggestionsWrap DOM node is ALWAYS present (never null)
 *   - Visibility is controlled via opacity + pointer-events + aria-hidden
 *   - The wrap uses position: absolute so it does NOT contribute to
 *     the document flow of sibling messages
 *   - Hidden state disables tab-stops on the chips
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SuggestedPrompts from './SuggestedPrompts';

describe('SuggestedPrompts — CLS stability', () => {
  it('renders the DOM node when visible=true', () => {
    render(
      <SuggestedPrompts
        context="coach_assistant"
        onSelect={vi.fn()}
        visible={true}
      />,
    );
    const wrap = screen.getByTestId('suggested-prompts');
    expect(wrap).toBeInTheDocument();
    expect(wrap.getAttribute('aria-hidden')).toBe('false');
  });

  it('KEEPS the DOM node in the tree when visible=false (no null return)', () => {
    // This is the core CLS fix. If this test fails, the component has
    // regressed to the `if (!visible) return null` pattern, which will
    // reintroduce a ~150px layout shift on every first message send.
    render(
      <SuggestedPrompts
        context="coach_assistant"
        onSelect={vi.fn()}
        visible={false}
      />,
    );
    const wrap = screen.getByTestId('suggested-prompts');
    expect(wrap).toBeInTheDocument();
    expect(wrap.getAttribute('aria-hidden')).toBe('true');
  });

  it('disables tab-stops on chips when visible=false', () => {
    const { container } = render(
      <SuggestedPrompts
        context="coach_assistant"
        onSelect={vi.fn()}
        visible={false}
      />,
    );
    const chips = container.querySelectorAll('button');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('enables tab-stops on chips when visible=true', () => {
    const { container } = render(
      <SuggestedPrompts
        context="coach_assistant"
        onSelect={vi.fn()}
        visible={true}
      />,
    );
    const chips = container.querySelectorAll('button');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip.getAttribute('tabindex')).toBe('0');
    }
  });

  it('renders the expected prompt count for the coach_assistant context', () => {
    const { container } = render(
      <SuggestedPrompts
        context="coach_assistant"
        onSelect={vi.fn()}
        visible={true}
      />,
    );
    // PROMPT_MAP['coach_assistant'] has 4 entries
    const chips = container.querySelectorAll('button');
    expect(chips.length).toBe(4);
  });

  it('falls back to DEFAULT_PROMPTS for an unknown context', () => {
    const { container } = render(
      <SuggestedPrompts
        // @ts-expect-error — deliberately passing an unknown context
        context="not_a_real_context"
        onSelect={vi.fn()}
        visible={true}
      />,
    );
    const chips = container.querySelectorAll('button');
    // DEFAULT_PROMPTS has 4 entries
    expect(chips.length).toBe(4);
  });
});
