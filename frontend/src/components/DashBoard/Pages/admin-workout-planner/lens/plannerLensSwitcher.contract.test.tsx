/**
 * plannerLensSwitcher.contract.test.tsx — S22 acceptance fence.
 * Locks: switching lenses triggers ZERO fetches (network spy); cards are
 * role=button + aria-pressed; active = purple border + Ice Wing check
 * (ruling A3 — no cyan, no dots per A5); reduced-motion disables lift +
 * smooth scroll; switcher lives inside the host so it cannot render with
 * the flag off; the choice persists via the validated preference key.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlannerLensSwitcher from './PlannerLensSwitcher';

const src = readFileSync(resolve(__dirname, 'PlannerLensSwitcher.tsx'), 'utf8');
const hostSrc = readFileSync(resolve(__dirname, 'PlannerLensHost.tsx'), 'utf8');
const layoutSrc = readFileSync(resolve(__dirname, '../WorkoutPlannerPageLayout.tsx'), 'utf8');

describe('S22 lens switcher', () => {
  const fetchSpy = vi.fn();
  beforeEach(() => vi.stubGlobal('fetch', fetchSpy));
  afterEach(() => vi.unstubAllGlobals());

  it('switching a lens fires the callback and zero network requests', () => {
    const onSelect = vi.fn();
    render(<PlannerLensSwitcher activeLensId="studio-classic" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /planner style/i }));
    const card = screen.getAllByRole('button', { name: /Thumb Deck/i })[0];
    expect(card.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith('thumb-deck');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('active card: purple border + Ice Wing check, no dots, no cyan literals', () => {
    expect(src).toContain('--accent-glow, #8B5CF6'); // Wing Purple active border
    expect(src).toContain('--world-accent'); // Ice Wing check (A3)
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeOnly).not.toMatch(/PaginationDot|dot-indicator|aria-hidden.*dot/i); // A5: pagination dots dropped
    expect(src).not.toContain('#00FFFF'); // retired Galaxy cyan never returns
  });

  it('reduced-motion disables lift and smooth scrolling', () => {
    expect(src).toMatch(/prefers-reduced-motion[\s\S]*scroll-behavior: auto/);
    expect(src).toMatch(/prefers-reduced-motion[\s\S]*transform: none/);
  });

  it('mounts only inside the host (flag-off cannot render it) and persists the pick', () => {
    expect(hostSrc).toContain('<PlannerLensSwitcher');
    expect(hostSrc).toContain('writePlannerLensId(id)');
    expect(layoutSrc).not.toContain('PlannerLensSwitcher'); // no out-of-flag mount
  });

  it('mobile carousel: 85% snap cards with peek, desktop grid', () => {
    expect(src).toContain('flex: 0 0 85%');
    expect(src).toContain('scroll-snap-type: x mandatory');
    expect(src).toContain('grid-template-columns: repeat(3, 1fr)');
  });
});
