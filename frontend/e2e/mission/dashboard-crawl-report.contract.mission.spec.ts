/**
 * FILE: dashboard-crawl-report.contract.mission.spec.ts
 * PURPOSE: Regression tests for the dashboard-crawl coverage/durability logic.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY: Slice 0 fixed four defects in the production dashboard crawl. Each one
 * failed SILENTLY — a partial run looked identical to a full one — so without
 * these tests a regression would be invisible by construction. Every test below
 * is written to fail against the pre-Slice-0 behaviour.
 *
 * Pure logic: no `page` fixture is requested, so no browser is launched. Lives
 * in e2e/mission (not src/) because vitest only globs `src/**`, and this code
 * must be covered by the pipeline that already runs the mission suite.
 */

import { expect, test } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  NO_ISSUES,
  compactIssues,
  createCrawlState,
  flushCrawlReport,
  formatCoverageLine,
  overTruncationBudget,
  summarizeCoverage,
  type CrawlIssueState,
} from './production-dashboard-crawl.report';

const ROUTES = ['/a', '/b', '/c', '/d'];

function stateWith(overrides: Partial<CrawlIssueState> = {}): CrawlIssueState {
  return { ...createCrawlState(), ...overrides };
}

test.describe('@mission @contract dashboard crawl report contract', () => {
  test('a crawl that died partway FAILS even when every visited route was clean', () => {
    // Pre-Slice-0: the loop aborted, the report was never attached, and the
    // surviving assertion only saw (empty) issue arrays — i.e. it could pass.
    const state = stateWith({
      routeResults: [
        { route: '/a', status: 'visited', clicks: 3 },
        { route: '/b', status: 'failed', clicks: 0, error: 'boom' },
      ],
    });

    const actionable = compactIssues(state, ROUTES);

    expect(actionable.routeFailures).toEqual(['/b — boom']);
    expect(actionable.unreachedRoutes).toEqual(['/c', '/d']);
    expect(actionable).not.toEqual(NO_ISSUES);
  });

  test('a fully clean crawl still passes', () => {
    const state = stateWith({
      routeResults: ROUTES.map((route) => ({ route, status: 'visited' as const, clicks: 1 })),
    });
    expect(compactIssues(state, ROUTES)).toEqual(NO_ISSUES);
  });

  test('coverage counts unreached routes rather than dropping them', () => {
    const state = stateWith({
      routeResults: [
        { route: '/a', status: 'visited', clicks: 1 },
        { route: '/b', status: 'failed', clicks: 0, error: 'x' },
      ],
    });

    const summary = summarizeCoverage('admin', ROUTES.length, state);

    expect(summary).toMatchObject({ total: 4, visited: 1, failed: 1, unreached: 2, complete: false });
  });

  test('the coverage banner makes a partial run unmistakable', () => {
    const partial = formatCoverageLine(
      summarizeCoverage('admin', 4, stateWith({
        routeResults: [{ route: '/a', status: 'visited', clicks: 1 }],
      })),
    );

    expect(partial).toContain('1/4 routes visited');
    expect(partial).toContain('NEVER REACHED');
  });

  test('truncation over the allowance fails and names the routes; within it passes', () => {
    const truncations = [{ route: '/a', exercised: 24, skipped: 36 }];

    // Default allowance is 0 — any truncation must fail, and the failure payload
    // carries the route + how much of it was never exercised.
    expect(overTruncationBudget(truncations, 0)).toEqual(truncations);
    // An explicitly raised allowance is visible, costed debt rather than silence.
    expect(overTruncationBudget(truncations, 1)).toEqual([]);
  });

  test('an empty route table is a vacuous pass, so the spec must guard route count', () => {
    // Found in dry-loop round 5. With no routes, every other assertion is
    // satisfied trivially and coverage reports "0/0 · complete" — the same
    // green-on-nothing failure as a missing auth state. The spec guards this
    // with an explicit routes.length > 0 assertion; this test pins WHY.
    const empty = summarizeCoverage('admin', 0, createCrawlState());
    expect(empty.complete).toBe(true);
    expect(compactIssues(createCrawlState(), [])).toEqual(NO_ISSUES);
    // ...therefore coverage alone cannot detect it, and the guard is required.
    expect(ROUTES.length).toBeGreaterThan(0);
  });

  test('the report is flushed to disk mid-crawl, so a crash still leaves evidence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'swan-crawl-report-'));
    try {
      const testInfo = { outputPath: (name: string) => join(dir, name) } as never;
      const state = stateWith({
        routeResults: [{ route: '/a', status: 'visited', clicks: 2 }],
        consoleErrors: ['TypeError: nope'],
      });

      const written = flushCrawlReport(testInfo, state, 'admin', ROUTES);
      expect(written).not.toBeNull();

      const report = JSON.parse(readFileSync(written as string, 'utf-8'));
      // Evidence collected BEFORE the hypothetical crash survives...
      expect(report.actionable.consoleErrors).toEqual(['TypeError: nope']);
      // ...and the routes never reached are recorded, not lost.
      expect(report.actionable.unreachedRoutes).toEqual(['/b', '/c', '/d']);
      expect(report.summary).toMatchObject({ visited: 1, unreached: 3, complete: false });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a failing flush never masks a crawl finding', () => {
    const testInfo = {
      outputPath: () => join('\0invalid', 'nope.json'),
    } as never;
    expect(() => flushCrawlReport(testInfo, createCrawlState(), 'admin', ROUTES)).not.toThrow();
    expect(flushCrawlReport(testInfo, createCrawlState(), 'admin', ROUTES)).toBeNull();
  });
});