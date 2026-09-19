/**
 * CoachSignalBanner — S1 contract (Social Feed Upgrade, MEGA-BLUEPRINT §6 S1)
 * ===========================================================================
 * Locks the panel-unanimous mechanic: coach recognition renders as GOLD
 * (earned-recognition token semantics), is display-only, degrades gracefully,
 * and never animates when the user asked for reduced motion.
 *
 * Added by the rule-61 hostile review (finding F1.4) — S1 shipped this component
 * with zero tests while every sibling in this directory had one.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import CoachSignalBanner from './CoachSignalBanner';

const SOURCE = readFileSync(resolve(__dirname, './CoachSignalBanner.tsx'), 'utf8');

const signal = (overrides: Record<string, unknown> = {}) => ({
  coachId: 7,
  coachDisplayName: 'Coach Dana',
  coachPhoto: null,
  note: null,
  ...overrides,
});

describe('CoachSignalBanner — render contract', () => {
  it('renders the coach name and the "Coach Signal" label', () => {
    render(<CoachSignalBanner signal={signal()} />);
    expect(screen.getByTestId('coach-signal-banner')).toBeInTheDocument();
    expect(screen.getByText('Coach Dana')).toBeInTheDocument();
    expect(screen.getByText('Coach Signal')).toBeInTheDocument();
  });

  it('renders the note when present and omits the note line when absent', () => {
    const { rerender } = render(<CoachSignalBanner signal={signal({ note: 'Proud of that PR' })} />);
    expect(screen.getByText('Proud of that PR')).toBeInTheDocument();

    rerender(<CoachSignalBanner signal={signal({ note: null })} />);
    expect(screen.queryByText('Proud of that PR')).not.toBeInTheDocument();
  });

  it('renders nothing without a display name (never a nameless gold frame)', () => {
    const { container } = render(
      <CoachSignalBanner signal={signal({ coachDisplayName: '' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the coach photo when supplied and the shield fallback when not', () => {
    const { rerender, container } = render(<CoachSignalBanner signal={signal()} />);
    expect(container.querySelector('img')).toBeNull();

    rerender(<CoachSignalBanner signal={signal({ coachPhoto: 'https://cdn.example/c.png' })} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    // Decorative: the name carries the meaning, so alt stays empty (no double-read).
    expect(img?.getAttribute('alt')).toBe('');
  });
});

describe('CoachSignalBanner — design-language source contracts', () => {
  it('uses the gold token, never a bare gold literal in the styled layer', () => {
    // Blueprint ban #8: gold means "earned". It must resolve through the token so a
    // theme change cannot silently repaint coach recognition.
    expect(SOURCE).toContain('var(--gold-accent, #C6A84B)');
    expect(SOURCE).not.toMatch(/border:\s*1px solid #C6A84B/);
  });

  it('never uses the reserved purple (AI-coach) or ice-cyan chrome', () => {
    expect(SOURCE).not.toContain('#8B5CF6');
    expect(SOURCE).not.toContain('#60C0F0');
  });

  it('is display-only — no interactive controls, so no touch-target obligation', () => {
    expect(SOURCE).not.toMatch(/styled\.(button|a|input)\b/);
  });

  it('disables animation under prefers-reduced-motion (rule 25)', () => {
    expect(SOURCE).toContain('@media (prefers-reduced-motion: reduce)');
    expect(SOURCE).toContain('animation: none');
  });
});
