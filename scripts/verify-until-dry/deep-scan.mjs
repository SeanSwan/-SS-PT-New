/**
 * @file deep-scan.mjs
 * @description Immutable, coverage-complete lifecycle for scheduled deep scans.
 */
import { canonicalJson, sha256 } from './ledger.mjs';

const HASH = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;

function requireHash(value, label, pattern = HASH) {
  if (!pattern.test(String(value ?? ''))) throw new Error(`${label} hash is invalid`);
}

export function startDeepScan(input = {}) {
  if (!input.id) throw new Error('Deep scan id is required');
  requireHash(input.headSha, 'Head commit', COMMIT);
  requireHash(input.sourceHash, 'Source');
  requireHash(input.scopeHash, 'Scope');
  const required = [...new Set(input.requiredAnalyzers ?? [])].sort();
  if (required.length === 0) throw new Error('At least one required analyzer is required');
  return Object.freeze({
    schema: 'verify-until-dry.deep-scan.v1',
    id: input.id,
    headSha: input.headSha,
    sourceHash: input.sourceHash,
    scopeHash: input.scopeHash,
    requiredAnalyzers: Object.freeze(required),
    analyzers: Object.freeze({}),
    status: 'IN_PROGRESS',
  });
}

export function recordAnalyzer(scan, result = {}) {
  if (scan?.status !== 'IN_PROGRESS') throw new Error('Deep scan is not accepting analyzer evidence');
  if (!scan.requiredAnalyzers.includes(result.id)) throw new Error(`Analyzer is not required: ${result.id}`);
  if (scan.analyzers[result.id]) throw new Error(`Duplicate analyzer evidence: ${result.id}`);
  requireHash(result.outputHash, 'Analyzer output');
  if (!Array.isArray(result.findings)) throw new Error('Analyzer findings must be an array');
  return Object.freeze({
    ...scan,
    analyzers: Object.freeze({
      ...scan.analyzers,
      [result.id]: Object.freeze({
        outputHash: result.outputHash,
        findings: Object.freeze(result.findings.map((finding) => Object.freeze({ ...finding }))),
      }),
    }),
  });
}

export function completeDeepScan(scan) {
  const missingAnalyzers = scan.requiredAnalyzers.filter((id) => !scan.analyzers[id]);
  if (missingAnalyzers.length) {
    return Object.freeze({ ...scan, status: 'UNPROVEN', missingAnalyzers: Object.freeze(missingAnalyzers) });
  }
  const openFindings = Object.values(scan.analyzers)
    .flatMap((analyzer) => analyzer.findings)
    .filter((finding) => finding.validated === true && finding.status === 'open');
  const completed = {
    ...scan,
    status: openFindings.length ? 'DIRTY' : 'COMPLETE',
    missingAnalyzers: Object.freeze([]),
    openFindings: Object.freeze(openFindings),
  };
  return Object.freeze({ ...completed, scanHash: sha256(canonicalJson(completed)) });
}
