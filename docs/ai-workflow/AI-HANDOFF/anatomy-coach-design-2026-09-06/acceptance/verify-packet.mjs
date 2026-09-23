/** Artifact-only integrity checks. Does not certify proposed application behavior. */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const files = [];
function walk(dir) { for (const name of readdirSync(dir)) { const path = resolve(dir, name); if (statSync(path).isDirectory()) walk(path); else files.push(path); } }
walk(root);
for (const path of files.filter(p => /\.(md|html)$/.test(p))) {
  const text = readFileSync(path, 'utf8');
  const refs = path.endsWith('.md') ? [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1])
    : [...text.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const raw of refs) {
    if (/^(https?:|#|data:)/.test(raw)) continue;
    const target = raw.replace(/^<|>$/g, '').split('#')[0];
    if (!existsSync(resolve(dirname(path), target))) errors.push(`Missing link: ${relative(root,path)} -> ${target}`);
  }
}
const receiptPath = resolve(root, 'readiness.json');
if (existsSync(receiptPath)) {
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  for (const req of receipt.requirements) if (!req.tests.length) errors.push(`Uncovered requirement: ${req.id}`);
} else errors.push('Missing readiness.json');
const manifest = resolve(root, 'evidence/source-manifest.json');
if (existsSync(manifest)) {
  const data = JSON.parse(readFileSync(manifest, 'utf8'));
  for (const item of data.files) {
    const path = resolve(data.repository, item.path);
    if (!existsSync(path) || createHash('sha256').update(readFileSync(path)).digest('hex') !== item.sha256) errors.push(`Source changed after audit: ${item.path}`);
  }
} else errors.push('Missing source-manifest.json');
const extra = JSON.parse(readFileSync(resolve(root,'evidence/personalization-source-manifest.json'),'utf8'));
for(const item of extra.files){const p=resolve(extra.repository,item.path);if(!existsSync(p)||createHash('sha256').update(readFileSync(p)).digest('hex')!==item.sha256)errors.push('Personalization source changed: '+item.path);}
const diagrams = files.filter(p => p.endsWith('.mmd'));
if (diagrams.length !== 9) errors.push(`Expected 9 diagrams; found ${diagrams.length}`);
for (const path of diagrams) if (!/^(flowchart|sequenceDiagram|stateDiagram-v2|erDiagram)\b/.test(readFileSync(path,'utf8'))) errors.push(`Unrecognized Mermaid: ${path}`);
const result = { artifactChecks: errors.length ? 'FAIL' : 'PASS', files: files.length, diagrams: diagrams.length, errors,
  limitation: 'Links, source hashes and basic inventory only. Mermaid render, application behavior and clinical calibration are separate evidence.' };
process.stdout.write(JSON.stringify(result,null,2)+'\n');
process.exitCode = errors.length ? 1 : 0;
