/**
 * ============================================================================
 * FILE: supportIssueConstants.mjs
 * PURPOSE: Re-export shim. The Report Room vocabulary now lives in
 *          @swan/schemas, beside the validation schema that consumes it, so the
 *          backend and the frontend form share ONE definition (SWA-225 EX-5).
 *
 * This file stays so its existing importers — SupportIssue.mjs,
 * SupportIssueEvent.mjs, supportIssueRoutes.mjs, adminSupportIssueRoutes.mjs —
 * keep working unchanged. New code should import from '@swan/schemas' directly.
 *
 * ORIGINAL AUTHOR: Codex GPT-5 | MOVED TO SHARED PACKAGE: 2026-09-03
 * ============================================================================
 */
export {
  SUPPORT_ISSUE_CATEGORIES,
  SUPPORT_ISSUE_SEVERITIES,
  SUPPORT_ISSUE_STATUSES,
  SUPPORT_ISSUE_SOURCES,
  SUPPORT_EVENT_TYPES,
  SUPPORT_EVENT_VISIBILITIES,
} from '@swan/schemas';
