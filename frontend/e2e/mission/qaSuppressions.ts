/**
 * FILE: qaSuppressions.ts
 * PURPOSE: The single registry of QA finding suppressions. Every entry expires.
 * OWNER: SwanStudios Mission QA.
 *
 * HOW TO ADD ONE — read this before appending:
 *
 *   Adding a suppression is admitting a defect and choosing not to fix it yet.
 *   That is sometimes correct. It is never free. Each entry needs:
 *     - `reason`  — what the noise IS and why shipping with it is acceptable.
 *                   "known issue" / "flaky" / "not ours" are not reasons.
 *     - `expires` — YYYY-MM-DD. On that date the build FAILS until someone
 *                   fixes the defect or consciously renews the entry.
 *
 *   A suppression that stops matching is reported as STALE, so entries do not
 *   quietly outlive the bug they were hiding.
 *
 * WHAT DOES NOT BELONG HERE:
 *   Harness artifacts — noise the crawl creates itself, e.g. the 405s from its
 *   own write-blocking interceptor and the 400s from tearing down Socket.IO
 *   polling. Those are not product defects being tolerated; they are the test
 *   rig's own exhaust, they are state-dependent rather than message-matchable,
 *   and they are filtered unconditionally in production-dashboard-crawl.report.ts.
 *   Do not migrate them here — an expiring suppression for the harness's own
 *   output would fail the build for no product reason.
 */

import type { Suppression } from './qaFindings';

export const QA_SUPPRESSIONS: Suppression[] = [
  {
    id: 'unused-link-preload',
    pattern: 'preloaded using link preload',
    reason:
      'Vite emits <link rel=preload> hints for chunks that some routes never execute, so Chrome '
      + 'warns the preload went unused. Cosmetic, no user impact, but it does mean we ship '
      + 'bandwidth nobody spends — revisit when the route-level chunking is next touched.',
    expires: '2026-11-10',
    owner: 'mission-qa',
  },
  {
    id: 'service-worker-disabled-notice',
    pattern: 'Service Worker: PWA functionality temporarily disabled',
    reason:
      'The app deliberately logs this while PWA/service-worker support is switched off. It is an '
      + 'intentional notice rather than a fault, but it is logged at error level, which is wrong — '
      + 'either downgrade it to info or re-enable the service worker before this expires.',
    expires: '2026-11-10',
    owner: 'mission-qa',
  },
];
