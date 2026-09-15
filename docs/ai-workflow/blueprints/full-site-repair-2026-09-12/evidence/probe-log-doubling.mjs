#!/usr/bin/env node
/**
 * S17 reconciliation probe: why does a naive parse of the CI log yield roughly
 * double the dead links the action itself reports?
 *
 * The action's own accounting is the sum of markdown-link-check's per-file
 * "ERROR: N dead links found!" lines. This probe compares that authoritative
 * number against the number of raw [x] lines and the number of unique
 * (file, target) pairs, so the parser downstream can reconcile exactly instead
 * of guessing. Read-only over an existing log.
 */
import fs from 'node:fs';

const raw = fs.readFileSync(process.argv[2], 'utf8');
const lines = raw
  .split(/\r?\n/)
  .map((l) => l.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z /, '').replace(/\u001b\[[0-9;]*m/g, ''));

let cur = null;
let errSum = 0;
let xLines = 0;
const pairs = new Map();
const perFile = new Map();
const perFileX = new Map();

for (const line of lines) {
  const fm = /^FILE: (.+)$/.exec(line);
  if (fm) {
    cur = fm[1].replace(/^\.\//, '');
    if (!perFileX.has(cur)) perFileX.set(cur, 0);
    continue;
  }
  const em = /^ERROR: (\d+) dead links found!$/.exec(line);
  if (em) {
    errSum += Number(em[1]);
    perFile.set(cur, Number(em[1]));
    continue;
  }
  if (line.startsWith('[✖] ') && cur) {
    xLines += 1;
    perFileX.set(cur, (perFileX.get(cur) || 0) + 1);
    let r = line.slice(4);
    const erm = / \[Error: ([^\]]*)\]/.exec(r);
    if (erm) r = r.slice(0, erm.index) + r.slice(erm.index + erm[0].length);
    const sm = / → Status: (\S+)/.exec(r);
    if (sm) r = r.slice(0, sm.index) + r.slice(sm.index + sm[0].length);
    const t = r.replace(/\s*\{$/, '').trim();
    const k = `${cur}\u0000${t}`;
    pairs.set(k, (pairs.get(k) || 0) + 1);
  }
}

const hist = {};
for (const v of pairs.values()) hist[v] = (hist[v] || 0) + 1;

// Per-file reconciliation: does xLines == 2 * reported for every file?
const mismatches = [];
for (const [file, reported] of perFile) {
  const x = perFileX.get(file) || 0;
  if (x !== reported * 2) mismatches.push({ file, reported, xLines: x, ratio: x / reported });
}

console.log(
  JSON.stringify(
    {
      actionErrorSum: errSum,
      filesWithErrorLine: perFile.size,
      rawXLines: xLines,
      xLinesOverErrorSum: xLines / errSum,
      uniqueFileTargetPairs: pairs.size,
      pairOccurrenceHistogram: hist,
      filesWhereXLinesIsNotExactly2x: mismatches.length,
      sampleMismatches: mismatches.slice(0, 10),
    },
    null,
    2,
  ),
);
