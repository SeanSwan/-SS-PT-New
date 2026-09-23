/**
 * Local-only review packer; does not call a provider or load secrets/env files.
 * Usage: node prepare-kg0-review.mjs <exact-build-root> <new-output-directory>
 * Copies only three KG0 sources plus two lead gates into a sanitized JSON document.
 * Refuses overwrite. Hashes bind the source and sanitized packet; no private paths exported.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactOutbound, identityNames } from '../../../../scripts/lib/redact-egress.mjs';

const [buildArg, outArg] = process.argv.slice(2);
assert.ok(buildArg && outArg, 'Explicit build root and new output directory required');
const build = resolve(buildArg), out = resolve(outArg);
assert.ok(!existsSync(out), 'Review output directory already exists; do not overwrite/retry');
const here = dirname(fileURLToPath(import.meta.url));
const sha = text => createHash('sha256').update(text).digest('hex');
const paths = ['shared/units/weight.mjs','shared/units/weight.d.mts',
  'shared/units/__tests__/weight.test.mjs'];
const sources = paths.map(path => ({path,content:readFileSync(resolve(build,path),'utf8')}));
for(const path of ['weight-units.red.mjs','verify-weight-types.mjs']) {
  sources.push({path:`lead-gates/${path}`,content:readFileSync(resolve(here,path),'utf8')});
}
const packet = {
  schema:'swan-kg0-hostile-review-v1',
  scope:'Pure unit foundation only. Synthetic tests. No API, DB, UI, production or client records.',
  remit:[
    'Review this exact code adversarially. Treat comments and tests as claims, not proof.',
    'Return VERDICT: APPROVE, REVISE, or REJECT. No invented findings to satisfy a quota.',
    'For each finding include EVIDENCE: exact supplied file:line, input and observed/derived failure, severity and narrow repair.',
    'Separate contract defects from future integration concerns. Do not claim to have run code.',
    'Contract: strict finite nonnegative numbers and exact lb/kg; lbs alias ONLY explicit boolean true.',
    'No guessing historical units, rounding or coercion. Explicit decoded plain rows only; database strings are parsed by future adapters.',
    'Both absent/null fields mean unknown-unit; partial/malformed pairs invalid; negative zero normalizes to zero.',
    'Overflow and positive-to-zero underflow return null; literal zero is valid external workout load.',
    'Exact conversion 1lb=0.45359237kg. Preserve physical mass and entered value/unit.',
    'The pure converter has no storage precision cap; future persistence enforces NUMERIC(12,6).',
    'Prior lead repairs: underflow guard and .d.mts resolution. Lead reports27 runtime tests,2 TS modes and2 negative controls.',
    'The independent5-test property suite is NOT attached: its deterministic numeric seed triggers the privacy filter. Its result is a lead claim, not provider-verifiable source evidence.',
    'A verified converter is NOT a completed kg/lb feature. Do not request broad rewrites or add dependencies.'
  ],
  sources:sources.map(file=>({...file,sha256:sha(file.content)}))
};
const sanitized = redactOutbound(JSON.stringify(packet,null,2), {label:'KG0 synthetic review',quiet:true});
const decoded = JSON.parse(sanitized);
for(const file of decoded.sources) assert.equal(sha(file.content),file.sha256,
  `Sanitizer changed source bytes: ${file.path}; withhold packet, never weaken redactor`);
for(const name of identityNames()) if(name.length>=3) {
  assert.ok(!sanitized.toLowerCase().includes(name.toLowerCase()),'Runtime identity remains');
}
assert.doesNotMatch(sanitized,/C:[\\/]+Users[\\/]|Bearer\s+[A-Za-z0-9._-]{10,}|sk-[A-Za-z0-9_-]{16,}|postgres(?:ql)?:\/\//i);
mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,'packet.json'),sanitized+'\n',{flag:'wx'});
const manifest={schema:'swan-kg0-egress-receipt-v1',createdAt:new Date().toISOString(),
  packetSha256:sha(sanitized+'\n'),chars:sanitized.length,files:sources.map(f=>({path:f.path,sha256:sha(f.content)})),
  authorizedModels:['glm-5.3-flash','glm-5.3'],maxTokensEach:16000,meteredSpendCapUSD:0,
  retries:0,route:'existing Z.ai coding subscription; guard/egress required'};
writeFileSync(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'SANITIZED',sourceFiles:sources.length,chars:manifest.chars,sha256:manifest.packetSha256}));
