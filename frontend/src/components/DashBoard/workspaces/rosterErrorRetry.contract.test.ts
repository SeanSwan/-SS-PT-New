/**
 * Contract: a failed client-roster load offers the trainer a way back.
 *
 * Five-surface review T2: the roster error rendered as a static ErrorNote —
 * "check your connection and reload the page" — on the surface that opens the
 * trainer's 2-click logging loop. Loading states outnumbered error states 30:3
 * in this tree; the money loop's failure UX was unspecified.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/components/DashBoard/workspaces';
const view = readFileSync(resolve(process.cwd(), `${dir}/ClientsWorkspace.view.tsx`), 'utf8');
const container = readFileSync(resolve(process.cwd(), `${dir}/ClientsWorkspace.tsx`), 'utf8');

describe('trainer roster error retry', () => {
  it('renders the shared ErrorCard, not a dead note', () => {
    expect(view).toContain("import ErrorCard from '../../ui/ErrorCard'");
    expect(view).toMatch(/testId="roster-error"/);
    expect(view).not.toMatch(/<ErrorNote>/);
  });

  it('the retry is wired to the roster loader', () => {
    expect(view).toMatch(/onRetry=\{props\.onRetryLoad\}/);
    expect(container).toMatch(/onRetryLoad=\{loadClients\}/);
  });

  it('still only shows the failure once loading has settled', () => {
    expect(view).toMatch(/props\.loadError && !props\.loading/);
  });
});
