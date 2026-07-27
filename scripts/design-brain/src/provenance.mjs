/** Minimal provenance and signed source-corpus clearance contracts. */
import { verifyAuthorityRecord } from './authority.mjs';
export const SOURCE_CLASSES = Object.freeze(['owned-synthetic', 'synthetic', 'licensed', 'mobbin']);
const codedError = (code, message) => { const error = new Error(`${code}: ${message}`); error.code = code; return error; };
export function validateProbe(probe) {
  if (probe?.queries !== 1 || probe?.results !== 1) throw codedError('E_PROBE_CAP', 'Probe cap is exactly 1 query and 1 result');
  return true;
}
export function validateSourceClass(sourceClass) {
  if (sourceClass === 'owned') throw codedError('E_SOURCE_CLASS_LEGACY', 'use owned-synthetic');
  if (/production/i.test(sourceClass ?? '')) throw codedError('E_SOURCE_PRODUCTION_BLOCKED', 'production-derived input is forbidden');
  if (!SOURCE_CLASSES.includes(sourceClass)) throw codedError('E_SOURCE_CLASS_INVALID', `unsupported source class ${sourceClass}`);
  return true;
}
export function validateSourceClearance(clearance, authority = {}) {
  const errors = [];
  if (clearance?.schemaVersion !== 'clearance/2') errors.push('schemaVersion must be clearance/2');
  if (clearance?.sourceClass !== 'mobbin') errors.push('sourceClass must be mobbin');
  if (clearance?.scope !== 'source-corpus') errors.push('scope must be source-corpus');
  if (clearance?.termsVersion !== '2026-05-16') errors.push('termsVersion must be 2026-05-16');
  if (clearance?.decisionType !== 'written-permission') errors.push('decisionType must be written-permission');
  errors.push(...verifyAuthorityRecord(clearance, { ...authority, purpose: 'source-corpus-clearance' }).errors);
  return { ok: errors.length === 0, errors };
}