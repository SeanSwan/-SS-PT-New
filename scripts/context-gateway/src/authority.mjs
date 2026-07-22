/**
 * authority.mjs — A0–A5 authority + supersession resolution (Phase 0 §3, threat row T6).
 * =======================================================================================
 * Assigns every candidate evidence path an authority tier so the compiler can rank truth:
 * current code beats governing policy beats shipped receipts beats open plans beats
 * generated pointers beats agent memos. Catalog rows contribute status (shipped/consensus
 * → A2, superseded → excluded from corroboration) and freshness (stale SHA ⇒ row rejected,
 * source doc still readable at its structural tier).
 *
 * The Phase-0 "first implementation" scope on purpose: pinned A1 list + path-structure
 * rules + catalog status. No inference, no LLM. Deterministic and testable.
 *
 * @module context-gateway/authority
 */

/** Pinned A1 governing-policy sources (Phase 0 §3). Checked before structural rules. */
export const A1_PINNED = [
  /^CLAUDE\.md$/, /^AGENTS\.md$/, /^docs\/brain\/REALITY\.md$/, /^docs\/ai-workflow\/references\/[^/]+\.md$/,
];

const RULES = [
  { tier: 'A5', re: /^docs\/ai-workflow\/brainstorms\// },
  { tier: 'A4', re: /^docs\/ai-workflow\/CATALOG\.md$|^\.ai-workflow\/CATALOG\.local\.md$/ },
  { tier: 'A3', re: /^docs\/ai-workflow\/AI-HANDOFF\// }, // refined to A2 by catalog status below
  { tier: 'A0', re: /\.(mjs|cjs|js|jsx|ts|tsx|py|sql|json|yml|yaml|sh|ps1)$/ },
];

/** Parse catalog markdown table → Map<filename, {date,author,decision,status,sha}>. */
export function parseCatalog(text) {
  const map = new Map();
  for (const line of String(text).split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('| path ') || line.startsWith('|---')) continue;
    const c = line.split('|').map((s) => s.trim());
    if (c.length >= 7 && c[1]) map.set(c[1], { date: c[2], author: c[3], decision: c[4], status: c[5], sha: c[6] });
  }
  return map;
}

/**
 * Resolve one repo-relative POSIX path to { tier, status, superseded, stale }.
 * @param {string} relPath
 * @param {Map} catalog             parsed catalog rows keyed by AI-HANDOFF basename
 * @param {Map} [shaByPath]         optional Map<relPath, blobSha12> for freshness checks
 */
export function resolveAuthority(relPath, catalog = new Map(), shaByPath = null) {
  const p = String(relPath).replaceAll('\\', '/');
  if (A1_PINNED.some((re) => re.test(p))) return { tier: 'A1', status: 'governing', superseded: false, stale: false };

  const base = p.startsWith('docs/ai-workflow/AI-HANDOFF/') ? p.slice('docs/ai-workflow/AI-HANDOFF/'.length) : null;
  const row = base ? catalog.get(base) : null;
  const stale = !!(row && shaByPath && shaByPath.get(p) && row.sha !== shaByPath.get(p));

  for (const { tier, re } of RULES) {
    if (!re.test(p)) continue;
    if (tier === 'A3' && row && !stale) {
      const s = row.status?.toLowerCase() ?? '';
      if (s === 'superseded') return { tier: 'A3', status: s, superseded: true, stale };
      if (s === 'shipped' || s === 'consensus') return { tier: 'A2', status: s, superseded: false, stale };
      return { tier: 'A3', status: s || 'open', superseded: false, stale };
    }
    return { tier, status: row?.status ?? null, superseded: false, stale };
  }
  return { tier: 'A5', status: null, superseded: false, stale: false }; // unknown docs rank lowest
}

export const TIER_RANK = { A0: 0, A1: 1, A2: 2, A3: 3, A4: 4, A5: 5 };
