/**
 * clientCardDataTruth.contract.test.ts
 * ====================================
 * DATA-TRUTH LOCK for the shared client card (admin + trainer).
 *
 * WHY THIS FILE EXISTS: these assertions used to live in
 * `TrainerDashboard/ClientManagement/MyClientsView.progressTruth.test.ts`. That file was mostly a
 * source-text lock on the legacy trainer card, BUT four of its assertions read LIVE files —
 * `clients-team/ClientHubGridCard.tsx` and `clients-team/clientCardReadiness.ts`. When the legacy
 * tree was deleted (2026-08-23, audit F3) those four would have died silently, quietly removing
 * data-truth coverage from code that ships. They are rehomed here verbatim in intent.
 *
 * THE LAW (CLAUDE.md "Data truth rule"): workout progress shown on a client card must come from
 * real logged workouts. A card may say "no logs yet" — it may NOT invent a progress percentage or
 * an improvement count. Honest absence beats fabricated proof.
 *
 * Source-text assertions (not render assertions) follow the established repo precedent for
 * structural truth tests — see dashboardSupersetInvariant.test.ts and clientCardSystem.contract.test.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = __dirname;

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CARD_SOURCE = stripComments(readFileSync(resolve(here, './ClientHubGridCard.tsx'), 'utf8'));
const READINESS_SOURCE = stripComments(
  readFileSync(resolve(here, './clientCardReadiness.ts'), 'utf8')
);

describe('Shared client card data-truth contract', () => {
  it('frames client progress as logged-workout proof, not a fabricated score', () => {
    expect(CARD_SOURCE).toMatch(/Workout Proof/);
    expect(CARD_SOURCE).toMatch(/chart-ready activity/);
  });

  it('states honest absence when a client has no logged workouts', () => {
    expect(READINESS_SOURCE).toMatch(/No logs yet/);
    expect(READINESS_SOURCE).toMatch(/Last logged:/);
  });

  it('never presents a placeholder overall-progress percentage as real proof', () => {
    // The legacy trainer card rendered "Overall Progress" from a mock progress object. The shared
    // card must not reintroduce that pattern under any audience.
    expect(CARD_SOURCE).not.toMatch(/Overall Progress/);
    expect(CARD_SOURCE).not.toMatch(/overallProgress/);
    expect(CARD_SOURCE).not.toMatch(/recentTrend/);
  });
});
