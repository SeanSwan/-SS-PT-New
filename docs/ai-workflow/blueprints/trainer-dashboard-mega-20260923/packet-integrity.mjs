import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export const entries = ['00-README', '01-architecture', '02-wireframes', '03-contracts',
  '04-build-order', '05-slices', '06-bans', '07-checkpoints', '08-decision-ledger',
  '09-tests', '10-delegated-bounds', '11-registries', '12-orphan-disposition',
  '13-as-built', '14-verification'].map(name => `${name}.md`);

// Same counting as the line budget: trailing blank lines do not count.
export const lineCount = content => content.trimEnd().split(/\r?\n/).length;

function decisionIds(text) {
  const ids = new Set();
  const expanded = text.replace(/D-(\d{3})[–-]D-(\d{3})/g, (_, start, end) => {
    if (+end < +start || +end - +start > 100) return 'INVALID_RANGE';
    return Array.from({ length: +end - +start + 1 }, (_, n) => `D-${String(+start + n).padStart(3, '0')}`).join(',');
  });
  for (const match of expanded.matchAll(/\bD-\d{3}\b/g)) ids.add(match[0]);
  return ids;
}

// CommonMark-style fences: ``` or ~~~, up to three spaces of indentation, closed
// only by the same character with at least the opening length.
function fenceReport(content) {
  let open = null;
  let fences = 0;
  for (const line of content.split(/\r?\n/)) {
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!match) continue;
    const [, marker, rest] = match;
    if (!open) { open = marker; fences++; continue; }
    if (marker[0] === open[0] && marker.length >= open.length && !rest.trim()) { open = null; fences++; }
  }
  return { fences, unclosed: open !== null };
}

function documentLinks(content) {
  const inline = [...content.matchAll(/\[[^\]]*\]\(([^)\s]+\.md)(?:#[^)]*)?\)/g)].map(m => m[1]);
  const reference = [...content.matchAll(/^ {0,3}\[[^\]]+\]:\s*<?([^\s>]+\.md)(?:#\S*)?>?/gm)].map(m => m[1]);
  return [...inline, ...reference];
}

function manifestRows(text) {
  return text.split(/\r?\n/)
    .map(line => /^\| ([^|]+\.md) \| (\d+) \| (\d+) \| ([^|]+) \|$/.exec(line))
    .filter(Boolean)
    .map(([, name, lines, fences, disposition]) => ({ name, lines: +lines, fences: +fences, disposition }));
}

export function inspectPacket(root) {
  const errors = [];
  const documents = new Set(entries);
  const measured = new Map();
  for (const file of documents) {
    const path = resolve(root, file);
    if (!existsSync(path)) { errors.push(`Missing required document: ${file}`); continue; }
    const content = readFileSync(path, 'utf8');
    const lines = lineCount(content);
    const fences = fenceReport(content);
    measured.set(file, { lines, fences: fences.fences });
    if (lines > 300) errors.push(`Line budget: ${file} has ${lines} lines (maximum 300)`);
    if (fences.unclosed) errors.push(`Unclosed code fence: ${file}`);
    for (const target of documentLinks(content)) {
      if (/^[a-z]:[\\/]/i.test(target) || target.startsWith('/') || target.startsWith('\\')) {
        errors.push(`Absolute document link: ${file} -> ${target}`);
        continue;
      }
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const linked = relative(resolve(root), resolve(dirname(path), target)).replaceAll('\\', '/');
      if (linked.startsWith('../') || isAbsolute(linked)) errors.push(`Escaping document link: ${file} -> ${target}`);
      else if (!existsSync(resolve(root, linked))) errors.push(`Broken document link: ${file} -> ${target}`);
      else documents.add(linked);
    }
  }
  const read = file => existsSync(resolve(root, file)) ? readFileSync(resolve(root, file), 'utf8') : '';
  const ledgerRows = read('08-decision-ledger.md').split(/\r?\n/).filter(line => /^\| D-\d{3} \|/.test(line));
  const ledger = ledgerRows.map(line => line.match(/D-\d{3}/)[0]);
  if (new Set(ledger).size !== ledger.length) errors.push('Duplicate decision ledger ID');
  const expected = Array.from({ length: 30 }, (_, n) => `D-${String(n + 1).padStart(3, '0')}`);
  for (const id of expected) if (!ledger.includes(id)) errors.push(`Missing decision: ${id}`);
  const slices = read('05-slices.md').split(/\r?\n/).filter(line => /^\| S\d+ \|/.test(line));
  const sliceIds = slices.map(line => line.match(/^\| (S\d+) \|/)[1]);
  for (const id of new Set(sliceIds)) {
    if (sliceIds.filter(other => other === id).length > 1) errors.push(`Duplicate slice: ${id}`);
    if (!/^S\d$/.test(id)) errors.push(`Unknown slice: ${id}`);
  }
  const bound = new Set(slices.flatMap(line => [...decisionIds(line)]));
  for (const id of ledger) if (!bound.has(id)) errors.push(`Unbound decision: ${id}`);
  for (const id of bound) if (!ledger.includes(id)) errors.push(`Unknown decision in slice: ${id}`);
  for (let n = 0; n < 10; n++) if (!sliceIds.includes(`S${n}`)) errors.push(`Missing slice: S${n}`);
  for (let n = 1; n <= 11; n++) if (!new RegExp(`\\bR${n}\\b`).test(slices.join('\n'))) errors.push(`Unbound requirement: R${n}`);

  // MANIFEST is the packet's own inventory: its counts must be true, and every
  // document it calls current/normative must ship and be reachable from an entry.
  const manifest = read('MANIFEST.md');
  if (!manifest) errors.push('Missing required document: MANIFEST.md');
  const rows = manifestRows(manifest);
  for (const row of rows) {
    const normative = /^Current normative/i.test(row.disposition.trim());
    if (!existsSync(resolve(root, row.name))) {
      if (normative) errors.push(`Manifest lists missing normative document: ${row.name}`);
      continue;
    }
    if (normative && !documents.has(row.name)) errors.push(`Normative document not linked from the packet: ${row.name}`);
    const actual = measured.get(row.name);
    if (actual && (actual.lines !== row.lines || actual.fences !== row.fences)) {
      errors.push(`Manifest count drift: ${row.name} lists ${row.lines} lines/${row.fences} fences, actual ${actual.lines}/${actual.fences}`);
    }
  }
  for (const file of documents) if (!rows.some(row => row.name === file)) errors.push(`Document missing from manifest: ${file}`);

  return { status: errors.length ? 'FAIL' : 'PASS', errors, documentCount: documents.size,
    decisionCount: ledger.length, boundDecisionCount: bound.size, sliceCount: slices.length,
    limitation: 'Structural package integrity only; this does not establish product or release readiness.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = inspectPacket(resolve(process.argv[2] || dirname(process.argv[1])));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}
