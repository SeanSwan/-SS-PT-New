// R7-06 baseline probe: run the SHIPPED manifest gate against the REAL manifest
// and report the retirement-pairing verdict before any repair.
import { readFileSync } from 'node:fs';
import { checkCandidateManifest, checkRetirementPairing } from '../coach-completion-checkpoint.mjs';
const PKG = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const doc = JSON.parse(readFileSync(`${PKG}/evidence/candidate-manifest.json`, 'utf8'));
console.log('entries:', doc.entries.length, 'baseHead:', doc.baseHead, 'headAtManifest:', doc.headAtManifest);
const all = checkCandidateManifest(doc, { root: process.cwd() });
console.log('total violations:', all.length);
console.log('--- retirement-pairing only ---');
for (const v of checkRetirementPairing(doc)) console.log('  ', v);
console.log('--- non-retirement (first 12) ---');
for (const v of all.filter((x) => !x.startsWith('retirement:')).slice(0, 12)) console.log('  ', v);
