/**
 * Triage the corpus hits WITHOUT echoing PII.
 *
 * Emails are reported by DOMAIN only — never the local part. A domain histogram
 * is exactly enough to decide "vendor/business address" vs "personal mailbox",
 * and nothing more. Cards are reported as known-test-vector vs unknown.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { luhnValid, isLlmBound } from '../../privacy-boundary-gate.mjs';

const ROOTS = [
  '.ai-workflow/hermes-inbox',
  'docs/ai-workflow/hermes-learning-packets',
  'docs/ai-workflow/brainstorms',
  'docs/ai-workflow/AI-HANDOFF',
  'AI-Village-Documentation',
];

// Publicly published gateway test vectors. Their presence in a doc is a code
// example, not a leak.
const TEST_CARDS = new Set([
  '4111111111111111', '4242424242424242', '4000056655665556', '5555555555554444',
  '5200828282828210', '378282246310005', '371449635398431', '6011111111111117',
  '3056930009020004', '6200000000000005', '4000002500003155', '4000000000009995',
]);

const EMAIL_RE = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
const CARD_RE = /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g;
const PHONE_RE = /(?<![\d-])(?:\+?1[ .-])?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?![\d-])/g;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

const domains = new Map();
const cards = new Map();
const phones = new Map();

for (const root of ROOTS) {
  for (const f of walk(root)) {
    const rel = f.replace(/\\/g, '/');
    if (!isLlmBound(rel)) continue;
    let st; try { st = statSync(f); } catch { continue; }
    if (st.size > 2 * 1024 * 1024) continue;
    let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }

    for (const m of text.matchAll(EMAIL_RE)) {
      const d = m[1].toLowerCase();
      domains.set(d, (domains.get(d) ?? 0) + 1);
    }
    for (const m of text.matchAll(CARD_RE)) {
      if (!luhnValid(m[0])) continue;
      const digits = m[0].replace(/\D/g, '');
      const label = TEST_CARDS.has(digits)
        ? `known-test-vector(${digits.length}d)`
        : `UNKNOWN(${digits.length}d, starts ${digits.slice(0, 1)}x)`;
      cards.set(label, (cards.get(label) ?? 0) + 1);
    }
    for (const m of text.matchAll(PHONE_RE)) {
      const digits = m[0].replace(/\D/g, '').slice(-10);
      const label = /^555/.test(digits.slice(3)) ? 'reserved-555 (fictional)' : `area-${digits.slice(0, 3)}`;
      phones.set(label, (phones.get(label) ?? 0) + 1);
    }
  }
}

const show = (title, map) => {
  console.log(`\n${title}`);
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (!rows.length) console.log('  (none)');
  for (const [k, v] of rows) console.log(`  ${String(v).padStart(3)}  ${k}`);
};

show('EMAIL DOMAINS (local parts never printed):', domains);
show('PAYMENT-CARD matches:', cards);
show('PHONE matches:', phones);
