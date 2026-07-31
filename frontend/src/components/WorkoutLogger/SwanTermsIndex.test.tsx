/**
 * Swan Terms Index — the glossary laws.
 * Sean, 2026-07-31: PR and RPE are printed all over the logger with no
 * explanation anywhere. These tests lock that (a) every abbreviation the
 * UI shows has an entry, (b) the entries are reachable, and (c) the
 * already-written-but-orphaned NASM definitions are the source of truth
 * rather than a second, drifting copy.
 */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SwanTermsIndex from './SwanTermsIndex';
import { SWAN_TERMS } from './SwanTermsIndex.terms';
import { RPE_EDUCATION, ONE_RM_EDUCATION } from './NASMEducationContent';

afterEach(cleanup);

describe('coverage: every on-screen abbreviation is explained', () => {
  it.each(['PR', 'RPE', '1RM', 'Tempo', 'ecc', 'iso', 'con', 'Pain level', 'Superset', 'OPT phase'])(
    '%s has an entry',
    (term) => {
      expect(SWAN_TERMS.some((entry) => entry.term === term)).toBe(true);
    },
  );

  it('PR and RPE are spelled out — the two Sean named', () => {
    const pr = SWAN_TERMS.find((entry) => entry.term === 'PR');
    const rpe = SWAN_TERMS.find((entry) => entry.term === 'RPE');
    expect(pr?.expands).toBe('Personal Record');
    expect(rpe?.expands).toBe('Rate of Perceived Exertion');
  });

  it('reuses the orphaned NASM definitions instead of forking a second copy', () => {
    const rpe = SWAN_TERMS.find((entry) => entry.term === 'RPE');
    const oneRm = SWAN_TERMS.find((entry) => entry.term === '1RM');
    expect(rpe?.meaning).toBe(RPE_EDUCATION.tip);
    expect(oneRm?.meaning).toBe(ONE_RM_EDUCATION.tip);
  });

  it('every entry carries an expansion and a plain-English meaning', () => {
    for (const entry of SWAN_TERMS) {
      expect(entry.expands.length, `${entry.term} expands`).toBeGreaterThan(3);
      expect(entry.meaning.length, `${entry.term} meaning`).toBeGreaterThan(20);
    }
  });
});

describe('the index renders and is searchable', () => {
  it('lists the terms grouped, with expansions visible', () => {
    render(<SwanTermsIndex />);
    expect(screen.getByRole('heading', { name: /What the numbers mean/i })).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
    expect(screen.getByText('Personal Record')).toBeInTheDocument();
    expect(screen.getByText('Rate of Perceived Exertion')).toBeInTheDocument();
  });

  it('filtering narrows to matching terms — by abbreviation OR by meaning', () => {
    render(<SwanTermsIndex />);
    const search = screen.getByRole('searchbox', { name: /Search terms/i });

    fireEvent.change(search, { target: { value: 'rpe' } });
    expect(screen.getByText('Rate of Perceived Exertion')).toBeInTheDocument();
    expect(screen.queryByText('Personal Record')).toBeNull();

    // Searching the plain-English side works too — you can look up the
    // concept without already knowing the abbreviation.
    fireEvent.change(search, { target: { value: 'best-ever' } });
    expect(screen.getByText('Personal Record')).toBeInTheDocument();
    expect(screen.queryByText('Rate of Perceived Exertion')).toBeNull();
  });

  it('a search with no hits says so instead of showing an empty void', () => {
    render(<SwanTermsIndex />);
    fireEvent.change(screen.getByRole('searchbox', { name: /Search terms/i }), {
      target: { value: 'zzzznotaterm' },
    });
    expect(screen.getByText(/No term matches/i)).toBeInTheDocument();
  });

  it('honors a starting filter so a term chip can deep-link into its entry', () => {
    render(<SwanTermsIndex initialQuery='PR' />);
    expect(screen.getByText('Personal Record')).toBeInTheDocument();
    expect(screen.queryByText('Rate of Perceived Exertion')).toBeNull();
  });
});
