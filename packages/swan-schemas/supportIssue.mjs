/**
 * ============================================================================
 * FILE: supportIssue.mjs
 * PURPOSE: The ONE definition of what a valid Report Room submission is —
 *          imported by the backend route that enforces it AND the frontend form
 *          that collects it.
 *
 * WHY THIS EXISTS (SWA-225 EX-5). The route declared
 * `title: z.string().trim().min(4)` and `description: …min(10)`, while
 * SupportReportComposer.tsx hand-wrote the SAME two rules a second time:
 *
 *     if (draft.title.trim().length < 4) errors.title = 'Add a short title…'
 *     if (draft.description.trim().length < 10) errors.description = '…'
 *
 * Two copies of one contract, in two languages, kept in step by nothing but
 * memory. That is CLAUDE.md Rule 58's drift class #6/#7 waiting to happen: the
 * day someone raises the server minimum, the form keeps cheerfully accepting
 * what the API will now reject, and the user meets a 400 the UI never predicted.
 *
 * The rules below are byte-identical to the ones lifted out of
 * routes/supportIssueRoutes.mjs — that route's existing tests, unchanged, are
 * the proof of faithfulness. If one of them fails, the move was wrong: fix the
 * schema, never the test.
 *
 * THE VOCABULARY MOVED TOO. The schema's enums depend on the workflow
 * constants, so they live here now and backend/domain/supportIssueConstants.mjs
 * re-exports them — its four existing importers (models, routes) keep working
 * untouched while there is still exactly one definition.
 *
 * ZOD 3 ON PURPOSE: the backend runs zod ^3.22.4. The frontend installs the
 * same major so a single schema instance can be handed to zodResolver. The
 * 3 → 4 upgrade is a separate slice that must move both ends at once.
 * ============================================================================
 */
import { z } from 'zod';

export const SUPPORT_ISSUE_CATEGORIES = Object.freeze([
  'bug',
  'error',
  'access',
  'billing',
  'workout',
  'account',
  'performance',
  'usability',
  'content',
  'other',
]);

export const SUPPORT_ISSUE_SEVERITIES = Object.freeze([
  'critical',
  'high',
  'medium',
  'low',
]);

export const SUPPORT_ISSUE_STATUSES = Object.freeze([
  'new',
  'triaged',
  'in_progress',
  'waiting_on_reporter',
  'resolved',
  'closed',
  'duplicate',
]);

export const SUPPORT_ISSUE_SOURCES = Object.freeze([
  'text',
  'voice',
  'swan_coach',
  'error_boundary',
]);

export const SUPPORT_EVENT_TYPES = Object.freeze([
  'created',
  'reporter_reply',
  'owner_reply',
  'internal_note',
  'triage_updated',
  'resolved',
  'closed',
  'reopened',
  'marked_duplicate',
]);

export const SUPPORT_EVENT_VISIBILITIES = Object.freeze(['reporter', 'owner']);

/**
 * A new Report Room submission. Enforced server-side by
 * routes/supportIssueRoutes.mjs and, via `.pick()`, presented client-side by
 * SupportReportComposer.tsx — so the user is told about a violation by the same
 * rule that would have rejected them.
 */
export const supportIssueCreateSchema = z.object({
  clientRequestId: z.string().uuid(),
  category: z.enum(SUPPORT_ISSUE_CATEGORIES),
  severity: z.enum(SUPPORT_ISSUE_SEVERITIES).default('medium'),
  source: z.enum(SUPPORT_ISSUE_SOURCES).default('text'),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(8000),
  expectedBehavior: z.string().trim().max(4000).optional().default(''),
  impact: z.string().trim().max(4000).optional().default(''),
  reproductionSteps: z
    .array(z.string().trim().min(1).max(500))
    .max(12)
    .optional()
    .default([]),
  diagnostics: z.record(z.unknown()).optional().default({}),
});

/**
 * The subset SupportReportComposer collects and validates in the browser.
 * Deliberately NOT the whole schema: clientRequestId, source and diagnostics are
 * supplied by the client at submit time, not typed by a human, so asking the
 * form to validate them would surface errors for fields nobody can see or fix.
 */
export const supportIssueComposerSchema = supportIssueCreateSchema.pick({
  category: true,
  severity: true,
  title: true,
  description: true,
  expectedBehavior: true,
  impact: true,
  reproductionSteps: true,
});
