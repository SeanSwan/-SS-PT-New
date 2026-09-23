/**
 * ============================================================================
 * FILE: csvEscape.ts
 * PURPOSE: Single source of truth for writing a value into a CSV cell — the
 *          CLIENT-side twin of backend/utils/csvEscape.mjs.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * The backend CSV audit (§21) found four server-side exports that had each grown
 * their own quoter, and consolidated them into `backend/utils/csvEscape.mjs`.
 * The client was never audited, and the same thing had happened there — nine
 * export sites in `frontend/src`, seven of them with a PRIVATE escaper:
 *
 *   components/Admin/SessionAllocationManager.logic.ts:37      escapeCsvCell
 *   components/Admin/TrainerPermissionsManager.logic.ts:115    escapeCsvCell
 *   components/Admin/SMSLogsPanel.tsx:130                      inline, always-quoted
 *   components/DashBoard/progress-proof/progressChartActions.ts:32   csvEscape
 *   components/TrainerDashboard/.../trainerClientReportExport.ts:36  csvCell
 *   components/DashBoard/.../admin-exercises/ExerciseLibraryManager.tsx:652  escapeCsvValue
 *   components/DashBoard/.../admin-exercises/ExerciseStatsPanel.tsx:558      escapeCsvValue
 *   components/DashBoard/.../admin-sessions/AdminSessionsSessionList.logic.ts:174  csvCell
 *   components/DashBoard/.../admin-clients/EnhancedAdminClientManagementView.tsx:2068  inline
 *
 * All seven helpers were **correct RFC 4180 quoters**. None of them neutralised a
 * formula, so all seven leaked `=1+1`, `=HYPERLINK(...)`, `=cmd|'/c calc'!A0`,
 * `+1`, `-1`, `@SUM(A1)` AND ` =1+1` (leading space). The ninth site did not even
 * double embedded quotes, so a client named `a"b` collapsed three columns into one.
 *
 * This is the distinction the backend module already documents, and it is the
 * reason this file is not "the CSV writer already escapes":
 *
 *   Structure      — a value containing `,` `"` CR or LF must be quoted and its
 *                    `"` doubled, or it silently shifts every later column.
 *   Interpretation — a spreadsheet treats a cell beginning with `=`, `+`, `-`,
 *                    `@`, TAB or CR as a FORMULA. `=1+1` contains no character
 *                    that triggers quoting, so it passes through a PERFECT
 *                    RFC 4180 quoter completely untouched.
 *
 * Escaping for structure does nothing for interpretation. Both are handled here.
 *
 * WHY THIS IS A REAL PATH AND NOT A THEORETICAL ONE
 * -------------------------------------------------
 * These exports run in the ADMIN's browser, built from data the CLIENT controls:
 * `session.client.firstName/lastName`, `session.location`, and the client's own
 * name/email/phone. The attacker is never the admin — it is any client who can set
 * their own name. Nothing server-side is involved, so `backend/utils/csvEscape.mjs`
 * never runs and the backend guard (which walks the backend tree for `.mjs`) never
 * sees it.
 *
 * USAGE
 * -----
 *   import { escapeCsvValue } from '@/utils/csvEscape';
 *
 *   const rows = sessions.map((s) => [s.id, s.client?.firstName].map(escapeCsvValue).join(','));
 *
 * `.map(escapeCsvValue)` is safe: this function takes exactly ONE argument, so
 * Array.prototype.map's index argument cannot leak into a second parameter.
 */

/**
 * Characters that make a spreadsheet parse the cell as a formula.
 *
 * Leading whitespace is included because Excel's text-import wizard, Google
 * Sheets and LibreOffice all trim before deciding — so ` =1+1` is as live as
 * `=1+1`. The backend module learned this the hard way (finding D6); the two
 * implementations must not drift.
 */
export const CSV_FORMULA_TRIGGER = /^\s*[=+\-@\t\r]/;

/** Characters that force RFC 4180 quoting. */
export const CSV_NEEDS_QUOTING = /[",\n\r]/;

/**
 * Render one value as a safe CSV cell.
 *
 * Numbers are NOT formula-prefixed: a negative number legitimately starts with
 * `-`, and turning `-5` into `'-5` would corrupt every numeric column. Only
 * *string* values are neutralised. A numeric STRING from user input is treated as
 * a string and neutralised, which is the safe direction — a spreadsheet reads
 * `'-5` as text, and text is never executed.
 *
 * The neutraliser is a leading apostrophe, which spreadsheets treat as "this cell
 * is literal text". That is the OWASP-recommended mitigation.
 */
export const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  const isNumber = typeof value === 'number' && Number.isFinite(value);
  let text = String(value);

  if (!isNumber && CSV_FORMULA_TRIGGER.test(text)) text = `'${text}`;

  return CSV_NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Serialise a header row plus data rows. CRLF-separated per RFC 4180 §2.1.
 *
 * NOT a drop-in replacement for the existing hand-joined builders: several of them
 * deliberately join with `\n` and their tests assert that exact byte sequence
 * (e.g. progressChartActions.test.ts). Migrating a call site to `serializeCsv`
 * changes its output from LF to CRLF. Prefer migrating the ESCAPER first, and only
 * move to `serializeCsv` when the caller's line ending is not pinned.
 */
export const serializeCsv = (
  headers: readonly unknown[],
  rows: readonly (readonly unknown[])[],
): string =>
  [headers.map(escapeCsvValue).join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))]
    .join('\r\n');
