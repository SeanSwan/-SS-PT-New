/**
 * Contract: the shared dashboard shell offers no unrouted component.
 *
 * UniversalDashboardLayout.routeComponents.tsx is imported by the routes file
 * that serves ALL FOUR roles. It exported MyClientsView (whose fallback carries
 * a mockClients array) and TrainerVideosPage (placeholder data) with no route
 * pointing at either. That is one line of routing drift away from putting fake
 * data in front of a trainer (Blueprint v2 S9, five-surface review X5/T1).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/components/DashBoard';
const shell = readFileSync(resolve(process.cwd(), `${dir}/UniversalDashboardLayout.routeComponents.tsx`), 'utf8');
const routes = readFileSync(resolve(process.cwd(), `${dir}/UniversalDashboardLayout.routes.tsx`), 'utf8');

describe('shell orphan exports', () => {
  it('no longer exports the mock-bearing client list', () => {
    expect(shell).not.toMatch(/export const MyClientsView\b/);
  });

  it('no longer exports the placeholder videos page', () => {
    expect(shell).not.toMatch(/export const TrainerVideosPage\b/);
  });

  it('the routes that replaced them are the ones actually mounted', () => {
    expect(routes).toMatch(/component: VideoLibraryPage/);
    expect(routes).toMatch(/TrainerClientsWorkspace/);
  });

  it('records the wider unrouted backlog WITHOUT asserting it away', () => {
    // Sweeping the shell turns up ~75 exports the routes file never names. That
    // is NOT 75 proven orphans: some are reached under a different local name,
    // some by other route configs, and Rule 34 forbids deleting on an
    // unverified sweep. Only the two above were consumer-swept and removed.
    //
    // This assertion pins the count so the backlog cannot grow silently while
    // a Rule-34 classify -> grep -> approve pass is pending Sean's decision.
    const exported = [...shell.matchAll(/export const (\w+) = React\.lazy/g)].map((m) => m[1]);
    const unrouted = exported.filter((name) => !new RegExp(String.raw`\b${name}\b`).test(routes));
    expect(exported.length).toBeGreaterThan(10);
    expect(unrouted.length).toBeLessThanOrEqual(75);
  });
});
