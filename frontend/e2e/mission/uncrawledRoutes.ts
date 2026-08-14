/**
 * FILE: uncrawledRoutes.ts
 * PURPOSE: The explicit, justified registry of dashboard routes the crawl does
 * NOT visit. Same doctrine as qaSuppressions: not crawling a real page is a
 * choice, and the choice has to be written down and defended.
 * OWNER: SwanStudios Mission QA.
 *
 * Before the drift gate existed, "not crawled" was indistinguishable from
 * "doesn't exist" — the crawl reported 100% coverage of a hand-typed list that
 * omitted 45 live routes, including the trainer commission ledger and admin
 * payouts. Silence is now impossible: every app route is either crawled or
 * listed here with a reason.
 *
 * A `reason` of "flaky", "later", or "not important" is not a reason.
 */

export interface UncrawledRoute {
  /** Full path exactly as the manifest derives it, including any `:param` segments. */
  path: string;
  /** Why the crawl cannot or should not visit it. */
  reason: string;
}

export const UNCRAWLED_ROUTES: readonly UncrawledRoute[] = [
  // --- Parameterised routes: no crawlable URL without a real, seeded record. ---
  // Visiting these with a literal ":clientId" renders an error state, so crawling
  // them blind would manufacture findings rather than discover them. They are the
  // proper subject of the cross-role journey work (seeded personas), not the crawl.
  {
    path: '/dashboard/admin/client-management/view-as/:userId',
    reason:
      'Impersonation route; needs a real user id. Blind visit renders an error state, so the '
      + 'crawl would report a defect it created itself. Belongs to seeded cross-role journeys.',
  },
  {
    path: '/dashboard/admin/nutrition/:clientId?',
    reason: 'Optional client id; the no-id form is reachable but renders an empty picker with no '
      + 'assertable content. Covered properly by a seeded journey.',
  },
  {
    path: '/dashboard/admin/workouts/:clientId?',
    reason: 'Same optional-client-id shape as admin nutrition; needs a seeded client to assert on.',
  },
  {
    path: '/dashboard/admin/notes/:clientId?',
    reason: 'Same optional-client-id shape; a blind visit shows an empty notes shell.',
  },
  {
    path: '/dashboard/admin/photos/:clientId?',
    reason: 'Same optional-client-id shape; a blind visit shows an empty gallery shell.',
  },
  {
    path: '/dashboard/trainer/nutrition/:clientId?',
    reason: 'Trainer-side twin of the admin nutrition route; needs a seeded assigned client.',
  },
  {
    path: '/dashboard/client/overview/:tab',
    reason:
      'Parameterised alias of /dashboard/client/overview, which IS crawled. The tab segment '
      + 'selects a panel within the same mounted page, so crawling it adds no new surface.',
  },
];

const BY_PATH = new Set(UNCRAWLED_ROUTES.map((entry) => entry.path));

export function isAcknowledgedUncrawled(routePath: string): boolean {
  return BY_PATH.has(routePath);
}
