/**
 * csvEscape.guard — the CLIENT-side twin of `backend/tests/unit/csvInjectionGuard.test.mjs`.
 * ==========================================================================================
 *
 * WHY A GUARD IS NEEDED AT ALL
 * ----------------------------
 * The backend guard walks the BACKEND tree, and only `.mjs` files. Every CSV export
 * in `frontend/src` is `.ts`/`.tsx`, so no guard in the repository looked at any of
 * them. An independent sweep found eleven browser-side CSV exports — eight with a
 * private escaper, two inline, and one with no escaping at all. All eight private
 * helpers were correct RFC 4180 quoters and all eight leaked a live formula.
 *
 * A one-time fix is not enough: the next export someone writes will re-grow a private
 * quoter, which is exactly how all eleven came to exist. So this file is a RATCHET.
 *
 * HOW IT AVOIDS BEING A GUARD THAT PROVES NOTHING
 * ----------------------------------------------
 * The two detectors below are exported as PURE functions over an in-memory file list.
 * That matters: a guard that reads the real tree and passes can be passing because it
 * matched nothing. Here the same functions are first run against synthetic fixtures
 * that MUST be flagged, so the detector is proven to fire before it is trusted.
 *
 * The rules are DERIVED, not hand-listed. A hand-written exemption list is the §20
 * defect class — it goes stale the moment a file is renamed or added.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(HERE, '..');

/** The one file allowed to contain the hand-rolled quoter — it IS the quoter. */
const SHARED_MODULE_REL = 'utils/csvEscape.ts';

/** Test files are excluded; a fixture that quotes the signature is not a defect. */
const TEST_PATH_RE = /\.(test|spec)\.[jt]sx?$/;

/**
 * The signature every one of the eight private escapers shared: a quote-doubling
 * replace. Deliberately narrow — it matches `'""'` only, so an HTML escaper that
 * doubles into `&quot;` (useBusinessIntelligence.ts) is NOT flagged.
 *
 * The `\\?` is load-bearing. Mutation testing caught an earlier version of this
 * regex MISSING `replace(/\"/g, '""')` — the backslash-escaped spelling of the same
 * defect, which is equally valid JavaScript. Matching only the unescaped form made
 * this ratchet evadable by typing one extra character.
 */
const HAND_ROLLED_DOUBLING = /replace\(\s*\/\\?"\s*\/g\s*,\s*'""'\s*\)/;

/** A file that hands a CSV to the browser: the MIME marker AND a Blob. */
const CSV_EMIT_MARKER = /text\/csv/;
const BLOB_RE = /new Blob\(/;

/** A file that joins its own cells — i.e. it builds rows rather than delegating. */
const ROW_JOIN_RE = /\.join\(\s*','\s*\)/;

const SHARED_IMPORT_RE = /from\s+['"]@\/utils\/csvEscape['"]/;

export interface SourceFile {
  /** Path relative to `frontend/src`, always forward-slashed. */
  rel: string;
  text: string;
}

export const isTestPath = (rel: string): boolean => TEST_PATH_RE.test(rel);

const isProduction = (f: SourceFile): boolean => !isTestPath(f.rel);

/**
 * RULE 1 — no production file may hand-roll CSV quote doubling.
 *
 * Any file doing this has grown its own escaper. It will be formula-blind, because
 * quote-doubling is a STRUCTURE fix and a formula is an INTERPRETATION threat.
 */
export const findHandRolledCsvQuoters = (files: readonly SourceFile[]): string[] =>
  files
    .filter(isProduction)
    .filter((f) => f.rel !== SHARED_MODULE_REL)
    .filter((f) => HAND_ROLLED_DOUBLING.test(f.text))
    .map((f) => f.rel);

/**
 * RULE 2 — a file that builds CSV rows must route them through the shared escaper.
 *
 * Scoped by three signals together, so that a file which merely *mentions* the
 * marker is not swept in: `text/csv` alone also appears in upload `accept=` lists
 * (useFileAttachment.ts, VoiceMemoUpload.tsx), and those are not exporters.
 *
 * The `.join(',')` requirement is what makes the rule derived rather than listed:
 * the four exporters that DELEGATE their row building to an already-migrated module
 * (the two `.controller.ts` files, `useAdminSessionsExport.ts`, and the
 * server-blob `RevenueAnalyticsPanel.tsx`) contain zero row joins, so they fall out
 * of scope on their own — no exemption list to go stale.
 */
export const findUnroutedCsvEmitters = (files: readonly SourceFile[]): string[] =>
  files
    .filter(isProduction)
    .filter((f) => CSV_EMIT_MARKER.test(f.text) && BLOB_RE.test(f.text) && ROW_JOIN_RE.test(f.text))
    .filter((f) => !SHARED_IMPORT_RE.test(f.text))
    .map((f) => f.rel);

/** Everything a guard needs to reach a verdict, with the pre-filter kept visible. */
export const findCsvEmitters = (files: readonly SourceFile[]): string[] =>
  files
    .filter(isProduction)
    .filter((f) => CSV_EMIT_MARKER.test(f.text) && BLOB_RE.test(f.text))
    .map((f) => f.rel);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const loadTree = (): SourceFile[] =>
  walk(SRC_ROOT).map((abs) => ({
    rel: path.relative(SRC_ROOT, abs).split(path.sep).join('/'),
    text: fs.readFileSync(abs, 'utf8'),
  }));

const FILES = loadTree();

// ---------------------------------------------------------------------------
// Part 1 — prove the detectors FIRE, on fixtures, before trusting them.
// ---------------------------------------------------------------------------
describe('the detectors fire for the right reason (fixture controls)', () => {
  it('RULE 1 flags a private escaper written in a production file', () => {
    const fixture: SourceFile = {
      rel: 'components/Somewhere/NewExport.ts',
      text: "const esc = (v: string) => `\"${v.replace(/\"/g, '\"\"')}\"`;",
    };
    expect(findHandRolledCsvQuoters([fixture])).toEqual(['components/Somewhere/NewExport.ts']);
  });

  it('RULE 1 also flags the backslash-escaped spelling replace(/\\"/g, ...)', () => {
    // Mutation M1 caught an earlier regex that missed this form. It is the same
    // defect written with one extra character, so the ratchet must not be evadable
    // by escaping the quote.
    const fixture: SourceFile = {
      rel: 'components/Somewhere/EscapedExport.ts',
      text: "const esc = (v: string) => `\"${v.replace(/\\\"/g, '\"\"')}\"`;",
    };
    expect(findHandRolledCsvQuoters([fixture])).toEqual(['components/Somewhere/EscapedExport.ts']);
  });

  it('RULE 1 does NOT flag the same text on a test path — a fixture is not a defect', () => {
    const fixture: SourceFile = {
      rel: 'components/Somewhere/NewExport.test.ts',
      text: "const esc = (v: string) => `\"${v.replace(/\"/g, '\"\"')}\"`;",
    };
    expect(findHandRolledCsvQuoters([fixture])).toEqual([]);
  });

  it('RULE 1 does NOT flag the shared module itself', () => {
    const fixture: SourceFile = {
      rel: SHARED_MODULE_REL,
      text: "return `\"${text.replace(/\"/g, '\"\"')}\"`;",
    };
    expect(findHandRolledCsvQuoters([fixture])).toEqual([]);
  });

  it('RULE 1 does NOT flag an HTML escaper that doubles into &quot;', () => {
    // This is the live shape in useBusinessIntelligence.ts. HTML escaping is a
    // different threat and must not be swept up by the CSV ratchet.
    const fixture: SourceFile = {
      rel: 'components/Somewhere/Html.ts',
      text: "value.replace(/&/g, '&amp;').replace(/\"/g, '&quot;')",
    };
    expect(findHandRolledCsvQuoters([fixture])).toEqual([]);
  });

  it('RULE 2 flags an exporter that builds its own rows and does not import the escaper', () => {
    const fixture: SourceFile = {
      rel: 'components/Somewhere/NewExport.ts',
      text: [
        "import { logger } from '@/utils/logger';",
        'const csv = rows.map((r) => r.join(\',\')).join(String.fromCharCode(10));',
        "const blob = new Blob([csv], { type: 'text/csv' });",
      ].join('\n'),
    };
    expect(findUnroutedCsvEmitters([fixture])).toEqual(['components/Somewhere/NewExport.ts']);
  });

  it('RULE 2 does NOT flag the same exporter once it imports the shared escaper', () => {
    const fixture: SourceFile = {
      rel: 'components/Somewhere/NewExport.ts',
      text: [
        "import { escapeCsvValue } from '@/utils/csvEscape';",
        "const csv = rows.map((r) => r.map(escapeCsvValue).join(',')).join(String.fromCharCode(10));",
        "const blob = new Blob([csv], { type: 'text/csv' });",
      ].join('\n'),
    };
    expect(findUnroutedCsvEmitters([fixture])).toEqual([]);
  });

  it('RULE 2 does NOT flag an upload allowlist that merely quotes the marker', () => {
    // `text/csv` in an accept list is a QUOTING of the marker, not an emitter.
    const fixture: SourceFile = {
      rel: 'components/Somewhere/Uploader.ts',
      text: "const ACCEPTED = ['text/plain', 'text/csv', 'application/pdf'];",
    };
    expect(findUnroutedCsvEmitters([fixture])).toEqual([]);
  });

  it('RULE 2 does NOT flag an exporter that delegates its row building', () => {
    // Mirrors useAdminSessionsExport.ts: it makes a Blob but joins nothing itself.
    const fixture: SourceFile = {
      rel: 'components/Somewhere/Delegating.ts',
      text: [
        "import { buildX } from './x.logic';",
        'const csvString = buildX(rows);',
        "const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });",
      ].join('\n'),
    };
    expect(findUnroutedCsvEmitters([fixture])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Part 2 — apply the proven detectors to the real tree.
// ---------------------------------------------------------------------------
describe('the frontend CSV export surface routes through one escaper', () => {
  it('the walked population is real, not empty', () => {
    // Without this, every assertion below would pass vacuously on a broken walk.
    expect(FILES.length).toBeGreaterThan(1000);
  });

  it('there is exactly one hand-rolled CSV quoter in the frontend: the shared module', () => {
    expect(findHandRolledCsvQuoters(FILES)).toEqual([]);
  });

  it('every exporter that builds its own rows imports the shared escaper', () => {
    expect(findUnroutedCsvEmitters(FILES)).toEqual([]);
  });

  it('the emitter population is non-empty, so RULE 2 is not passing on an empty set', () => {
    // If this ever drops below the known count, the emit signature has gone stale
    // and RULE 2 has silently stopped looking at anything.
    const emitters = findCsvEmitters(FILES);
    expect(emitters.length).toBeGreaterThanOrEqual(10);
    expect(emitters).toContain('components/Admin/SMSLogsPanel.tsx');
    expect(emitters).toContain(
      'components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx',
    );
    expect(emitters).toContain(
      'components/DashBoard/Pages/admin-exercises/hooks/useExerciseStats.ts',
    );
    expect(emitters).toContain(
      'components/UniversalMasterSchedule/hooks/useBusinessIntelligence.ts',
    );
  });
});
