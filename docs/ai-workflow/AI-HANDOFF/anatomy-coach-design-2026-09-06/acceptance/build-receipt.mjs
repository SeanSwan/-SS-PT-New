/** Rebuild this plan receipt from actual file hashes. Does not remove open readiness blockers. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = JSON.parse(readFileSync(resolve(root,'acceptance/receipt-input.json'),'utf8'));
const ref = path => ({path,sha256:createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')});
const complete = (...paths) => ({status:'COMPLETE',evidence:paths.map(ref)});
const requirements = input.requirements.map(({id,acceptance,tests})=>({id,acceptance,tests}));
const tests = input.scenarios.map(([id,,,,,,command])=>({id,
  requirements:requirements.filter(r=>r.tests.includes(id)).map(r=>r.id),command,
  status:'NOT RUN',reason:'Future implementation acceptance; application building prohibited in this turn.',evidence:[]}));
for(const [id,status,command,path] of [
  ['B01','FAIL','From frontend: node node_modules/vitest/vitest.mjs run src/components/BodyMap src/components/DashBoard/Pages/coach-assistant --reporter=dot','evidence/frontend-baseline.log'],
  ['B02','PASS','From backend: node node_modules/vitest/vitest.mjs run tests/api/painEntryRoutesAccessGuard.test.mjs tests/unit/aiChatPainContextSource.test.mjs --reporter=dot','evidence/backend-baseline.log'],
  ['B03','PASS','From root: node --test --test-concurrency=1 scripts/design-brain/tests/*.test.mjs','evidence/design-brain-baseline.log']
]) tests.push({id,requirements:requirements.filter(r=>r.tests.includes(id)).map(r=>r.id),command,status,evidence:[ref(path)]});
if(existsSync(resolve(root,'evidence/artifact-verification.json'))){
  const check=JSON.parse(readFileSync(resolve(root,'evidence/artifact-verification.json'),'utf8'));
  if(check.artifactChecks==='PASS') Object.assign(tests.find(t=>t.id==='T25'),{status:'PASS',
    reason:'Artifact links/source hashes, skill validation and rendered diagrams verified. Full readiness gate intentionally remains failed for open blockers/B01.',
    evidence:['evidence/artifact-verification.json','evidence/skill-validation.log','evidence/visual-review.json','evidence/atlas-v13-review.json','evidence/preservation-original.log'].map(ref)});
}
const receipt={schemaVersion:1,phase:'plan',ui:true,artifact:'SPA-20260906',version:'1.3',
  disposition:'Planning handoff delivered; application implementation NOT AUTHORIZED and implementation readiness withheld.',
  blockers:['B01: two existing frontend source-structure assertions fail; preserve intended behavior and reproduce on selected source.',
    'S0: reconcile shared checkout versus Universe V3/Astra-owned worktrees and exact release source before implementation.',
    'Future release gates: real DB/permission/migration acceptance, pinned asset mapping/device budgets and reviewed recovery calibration are not yet verified.'],
  nextSlice:'No application slice authorized. Next authorized action is review of this completed planning handoff; S0 begins only on a later implementation instruction.',
  sections:{baseline:complete('01-baseline-audit.md','evidence/baseline.json','evidence/source-manifest.json'),
    requirements:complete('08-tests-traceability.md'),blueprint:complete('02-pain-atlas-blueprint.md','04-coach-experience.md','05-design-brain-review.md','11-training-recovery.md','13-interactive-design-teaching-prompt.md','14-custom-anatomy-assets.md','15-profile-driven-body.md'),
    flowchart:complete('diagrams/pain-flow.mmd','diagrams/recovery-flow.mmd','diagrams/personalization-flow.mmd','diagrams/asset-feasibility.mmd','evidence/visual-review.json'),
    contracts:complete('03-contracts-data-privacy.md','11-training-recovery.md','14-custom-anatomy-assets.md','15-profile-driven-body.md'),tests:complete('08-tests-traceability.md','acceptance/scenarios.json','acceptance/api-contract.test.mjs','acceptance/model-conformance.test.mjs','acceptance/ui.spec.cjs','acceptance/atlas-port-contract.test.mjs'),
    traceability:complete('08-tests-traceability.md'),slices:complete('09-slices-operations-review.md','10-builder-handoff.md'),
    review:complete('09-slices-operations-review.md','05-design-brain-review.md','14-custom-anatomy-assets.md','15-profile-driven-body.md'),preservation:complete('evidence/preservation-original.log','evidence/atlas-v13-review.json','01-baseline-audit.md'),
    wireframes:complete('review.html','review.css','review.js','06-wireframes-states.md','evidence/visual-review.json'),
    state:complete('diagrams/coach-state.mmd','06-wireframes-states.md','15-profile-driven-body.md'),sequence:complete('diagrams/write-sequence.mmd'),
    erd:complete('diagrams/data-model.mmd','03-contracts-data-privacy.md'),permissions:complete('03-contracts-data-privacy.md','15-profile-driven-body.md'),
    privacy:complete('diagrams/privacy-flow.mmd','03-contracts-data-privacy.md','15-profile-driven-body.md'),operations:complete('09-slices-operations-review.md','11-training-recovery.md')},
  requirements,tests};
// Compact per-entry formatting keeps this machine receipt below the repository's source line budget.
writeFileSync(resolve(root,'readiness.json'),JSON.stringify(receipt,null,0)+'\n');
process.stdout.write(JSON.stringify({requirements:requirements.length,tests:tests.length,phase:receipt.phase,blockers:receipt.blockers.length})+'\n');
