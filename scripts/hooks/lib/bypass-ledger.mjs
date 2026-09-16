/**
 * bypass-ledger.mjs — record every use of an escape hatch, so bypassing stops being silent.
 *
 * WHY (Ox Alpha, panel 2026-08-23)
 * --------------------------------
 * "Every gate here is a suggestion against an agent that decides. The marker-variable
 * pattern (SWAN_RULE45_OK=1) is the weakest part — an approval channel with no record of
 * who approved, what was approved, or why. At minimum: every escape-hatch use writes an
 * append-only audit line. An agent may still bypass, but bypass stops being silent, and
 * silence is the actual enemy."
 *
 * That is the honest threat model. These gates are airbags, not locks: effective against
 * carelessness, theatre against intent. Nothing here changes that, and pretending otherwise
 * would be the mistake. What it changes is observability — a bypass rate is measurable, and
 * a gate whose bypass rate climbs is failing operationally no matter how green its tests are.
 *
 * WHAT IT IS NOT
 * --------------
 * Not an approval system. It records; it never authorises. It cannot stop anyone, and an
 * agent that edits this file removes it — which is exactly why it is worth having the
 * record be append-only and boring rather than clever.
 *
 * PRIVACY (Rules 8/44/59). Records the gate, the escape used, and a redacted 120-char
 * fragment. Command text is scrubbed of secret shapes before it is written, and the ledger
 * is gitignored and machine-local — the same posture as the spend ledger.
 */
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const LEDGER_REL = join('.ai-workflow', 'bypass', 'ledger.jsonl');

/**
 * Strip anything that looks like a credential before it reaches disk. The ledger exists to
 * make bypasses visible, and would be self-defeating if making them visible leaked a key.
 */
export function redact(text) {
  return String(text ?? '')
    .replace(/\b(sk|rk|pk)[-_][A-Za-z0-9_-]{8,}/g, '<REDACTED-KEY>')
    .replace(/\bghp_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, '<REDACTED-KEY>')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}/g, '<REDACTED-KEY>')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '<REDACTED-JWT>')
    .replace(/\b[a-z]+:\/\/[^\s@]+:[^\s@]+@/gi, '<REDACTED-URL-CREDS>@')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '<REDACTED-EMAIL>')
    .replace(/\b\d{8,}\b/g, '<REDACTED-NUM>')
    .slice(0, 120);
}

/**
 * @param {{gate:string, escape:string, detail?:string, repoRoot?:string, now?:()=>number}} e
 * @returns {boolean} whether the line was written. NEVER throws — a ledger that can break a
 *                    gate would make recording bypasses more dangerous than not recording.
 */
export function recordBypass({ gate, escape, detail = '', repoRoot = process.cwd(), now = Date.now }) {
  try {
    const path = join(repoRoot, LEDGER_REL);
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify({
      at: new Date(now()).toISOString(),
      gate,
      escape,
      detail: redact(detail),
    })}\n`);
    return true;
  } catch {
    return false;
  }
}

/** Read the ledger back. Malformed lines are skipped rather than throwing — a corrupt line
 *  must not hide the rest of the record. */
export function readBypasses(repoRoot = process.cwd()) {
  const path = join(repoRoot, LEDGER_REL);
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return out;
}

/** Bypasses per gate, for "is this gate failing operationally?" */
export function summarise(entries) {
  const byGate = {};
  for (const e of entries) {
    byGate[e.gate] = byGate[e.gate] || { total: 0, escapes: {} };
    byGate[e.gate].total += 1;
    byGate[e.gate].escapes[e.escape] = (byGate[e.gate].escapes[e.escape] || 0) + 1;
  }
  return byGate;
}
