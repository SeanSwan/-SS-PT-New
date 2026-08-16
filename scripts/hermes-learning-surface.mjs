#!/usr/bin/env node
/**
 * hermes-learning-surface — the READ side of the durable learning corpus.
 *
 * WHY THIS EXISTS (the largest gap in the v2 design, Kimi 2026-08-13)
 *   Rule 68 is entirely a WRITE trigger. It says when a lesson must be recorded and never says
 *   when anything is obliged to CONSULT one. The measured result: the ephemeral inbox tier — which
 *   HAS an automated read hook — reached 641 consumptions, while the durable tier that "compounds
 *   forever" had exactly one hand-written pointer to it. 17 of 18 permanent lessons were written
 *   and unreachable. Improving the shape of a tier nobody reads is not an improvement.
 *
 *   "Enterprise knowledge systems fail by going unread, not by being malformed." — Kimi K3
 *
 * DESIGN — pointer, not payload (Rule 72 catalog doctrine)
 *   Dumping 40+ packets into every session is how a knowledge base becomes a tax people route
 *   around. So session start prints a SHORT pointer plus the exact grep command, and the content is
 *   pulled on demand. That only works because every packet now carries `title` (the lesson as a
 *   claim) and `decision` (the rule it establishes) — which is what the 2026-08-16 migration was
 *   actually for.
 *
 * USAGE
 *   node scripts/hermes-learning-surface.mjs --session-start   # compact pointer for the hook
 *   node scripts/hermes-learning-surface.mjs --grep "<term>"   # search titles + decisions + body
 *   node scripts/hermes-learning-surface.mjs --list            # every title, newest first
 *
 * EXIT CODES
 *   0 = ok (including "no matches" — an empty search is an answer, not an error)
 *   3 = bad invocation
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './hermes-learning-validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CORPUS = join(ROOT, 'docs', 'ai-workflow', 'hermes-learning-packets');
const REL = 'docs/ai-workflow/hermes-learning-packets';

export function loadCorpus(dir = CORPUS) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'INDEX.md')
    .map((name) => {
      const src = readFileSync(join(dir, name), 'utf8');
      const fm = parseFrontmatter(src);
      const fileDate = (/^(\d{4})-?(\d{2})-?(\d{2})/.exec(name) || []).slice(1, 4).join('-');
      return {
        name,
        date: fm.values?.date || fileDate || '',
        title: unquote(fm.values?.title) || deriveTitleFromName(name),
        decision: unquote(fm.values?.decision) || '',
        status: fm.values?.status || '',
        body: fm.body || src,
      };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function unquote(v) {
  if (!v) return '';
  const s = String(v).trim();
  return /^".*"$/.test(s) || /^'.*'$/.test(s) ? s.slice(1, -1) : s;
}

function deriveTitleFromName(name) {
  return name.replace(/\.md$/, '').replace(/^\d{4}-?\d{2}-?\d{2}-?/, '').split('-').join(' ');
}

/**
 * Search titles and decisions first, then bodies. A hit in the claim itself is a stronger signal
 * than a passing mention buried in prose, so the two are reported separately rather than blended
 * into one relevance score nobody can audit.
 */
export function search(packets, term) {
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const claim = [];
  const mention = [];
  for (const p of packets) {
    if (re.test(p.title) || re.test(p.decision)) claim.push(p);
    else if (re.test(p.body)) mention.push(p);
  }
  return { claim, mention };
}

function truncate(s, n) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function sessionStart(packets) {
  if (!packets.length) return;
  const recent = packets.slice(0, 3);
  const out = [
    `[learning-corpus] ${packets.length} durable lessons. These are things this project already`,
    `[learning-corpus] learned the hard way — consult BEFORE asserting something is broken, novel,`,
    `[learning-corpus] or safe to skip. Grep, do not load wholesale:`,
    `[learning-corpus]   node scripts/hermes-learning-surface.mjs --grep "<topic>"`,
    `[learning-corpus] most recent:`,
    ...recent.map((p) => `[learning-corpus]   ${p.date}  ${truncate(p.title, 88)}`),
  ];
  console.log(out.join('\n'));
}

function main(argv) {
  const packets = loadCorpus();

  if (argv.includes('--session-start')) { sessionStart(packets); return 0; }

  if (argv.includes('--list')) {
    console.log(`${packets.length} durable lesson(s), newest first:\n`);
    for (const p of packets) {
      console.log(`  ${p.date}  ${truncate(p.title, 96)}`);
      console.log(`             ${REL}/${p.name}`);
    }
    return 0;
  }

  const gi = argv.indexOf('--grep');
  if (gi !== -1) {
    const term = argv[gi + 1];
    if (!term) { console.error('--grep requires a term'); return 3; }
    const { claim, mention } = search(packets, term);

    if (!claim.length && !mention.length) {
      // An empty result is a real answer, and saying so plainly matters: a silent exit reads as
      // "the tool is broken", which is how a read path stops being trusted and then stops being used.
      console.log(`no durable lesson matches "${term}" (searched ${packets.length} packets: titles, decisions, bodies)`);
      return 0;
    }

    if (claim.length) {
      console.log(`\nLESSON IS ABOUT THIS (${claim.length}):\n`);
      for (const p of claim) {
        console.log(`  ${p.date}  ${truncate(p.title, 96)}`);
        if (p.decision) console.log(`      rule: ${truncate(p.decision, 150)}`);
        console.log(`      ${REL}/${p.name}\n`);
      }
    }
    if (mention.length) {
      console.log(`mentioned in passing (${mention.length}) — weaker signal:\n`);
      for (const p of mention) console.log(`  ${p.date}  ${truncate(p.title, 88)}  ${REL}/${p.name}`);
      console.log();
    }
    return 0;
  }

  console.error('usage: --session-start | --grep "<term>" | --list');
  return 3;
}

if (process.argv[1]?.endsWith('hermes-learning-surface.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
