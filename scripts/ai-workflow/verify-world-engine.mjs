#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCatalogIntegrity } from './world-engine-catalog-validation.mjs';
import { verifyRouletteImplementation } from './verify-world-roulette.mjs';
export { verifyRouletteImplementation };

export const EXPECTED_WORLD_FAMILIES = Object.freeze([
  'natural-sublime', 'cosmic', 'constructed-tech',
  'miniature-play', 'cinematic-reality',
]);

const REQUIRED_FILES = Object.freeze({
  worlds: 'docs/ai-workflow/design-brain/worlds.md', techniques: 'docs/ai-workflow/design-brain/techniques.md',
  psychology: 'docs/ai-workflow/design-brain/psychology.md', experience: 'docs/ai-workflow/design-brain/experience-mode.md',
  router: '.claude/skills/swan-design-router/SKILL.md', factory: '.claude/skills/swan-world-factory/SKILL.md',
  registry: 'docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md', archetypes: 'docs/ai-workflow/design-brain/website-archetypes.md',
  sourceSystem: 'docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md', sourceAssets: 'docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md',
  knowledge: 'docs/ai-workflow/design-brain/adapters/knowledge.md', index: 'docs/ai-workflow/design-brain/index.md',
  designMd: 'docs/ai-workflow/design-brain/design.md', motion: 'docs/ai-workflow/design-brain/motion.md',
  cinematic: 'docs/ai-workflow/design-brain/cinematic-pages.md', reviewers: 'docs/ai-workflow/design-brain/adapters/reviewers.md',
  externalReference: 'docs/ai-workflow/design-brain/external-reference-mcp.md', handoff: 'docs/ai-workflow/AI-HANDOFF/SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md',
  roulette: 'scripts/ai-workflow/world-roulette.mjs', rouletteVerifier: 'scripts/ai-workflow/verify-world-roulette.mjs',
  rouletteTest: 'scripts/__tests__/world-roulette.test.mjs',
});

const MOJIBAKE = /(?:�|â€”|â€“|â†|â‰|â€œ|â€|Â·|ðŸ)/u;
const PLACEHOLDER = /(?:TODO_FILL_BEFORE_USE|<TODO|\bTBD\b|\bFIXME\b|\[placeholder\])/i;
const VISUAL_TIER_COLLISION = /^#{2,4}\s+T(?:[1-9]|1[0-3])\b/m;
const FRAME_MEASUREMENT_LAW = Object.freeze([
  [/Full authored render\/main-thread work budget is\s*≤\s*16\.7ms/i, '16.7ms authored-work deadline'],
  [/rAF callback-to-callback p95 is presentation cadence, not authored work/i, 'rAF/work separation'],
  [/Still-mode 120-frame cadence median identifies the refresh quantum/i, 'same-page refresh-quantum calibration'],
  [/60Hz-or-faster/i, 'Full refresh eligibility'],
  [/missed presentation is any interval\s*≥\s*1\.5x the refresh quantum/i, 'quantum-relative missed presentation'],
  [/three consecutive 120-frame Full windows with active deadline\/cap breaches/i, '120-frame deadline/cap hysteresis'],
  [/Chrome Performance task\/style\/layout\/script deltas plus Long Animation Frame and Long Task evidence/i, 'authored-work evidence'],
  [/B1 qualification requires zero missed presentations, no LoAF\/long task, and aggregate Chrome work-proxy ms\/presentation under 16\.7ms/i, 'B1 aggregate work gate'],
  [/A saved DevTools\/renderer trace is required to claim p95 and for B2\/B3 production promotion/i, 'trace-only p95 and spatial promotion'],
  [/no baseline subtraction/i, 'no-baseline-subtraction boundary'],
  [/raw measurement receipt[\s\S]*ordered raw rAF timestamps\/intervals[\s\S]*raw (?:Chrome )?trace\/work deltas/i, 'two-channel raw receipt'],
  [/no fixed millisecond tolerance/i, 'no-fixed-tolerance boundary'],
  [/raw unnormalized production RUM[\s\S]*Never subtract[\s\S]*Still calibration/i, 'unnormalized production RUM'],
]);
const FRAME_MEASUREMENT_SUBSTITUTE = /three consecutive two-second windows|fixed\s+\d+(?:\.\d+)?ms tolerance|(?:baseline|Still|idle)[-\s]normalized production RUM|rAF(?: callback-to-callback)? p95\s*(?:<=|≤)\s*16\.7ms|baseline-(?:subtracted|corrected|normalized)\s+(?:rAF|frame|production|authored)|aggregate Chrome work-proxy[^.\n]{0,120}(?:as|is)\s+p95/i;

const HANDOFF_FRAME_SUBSTITUTE = /p95\s+canonical[-\s]animation\s+frame\s*(?:<=|\u2264)\s*16\.7ms/i;
function uniqueMatches(text, pattern) {
  return [...new Set([...text.matchAll(pattern)].map((match) => match[1] ?? match[0]))];
}

function requirePattern(errors, text, pattern, message) {
  pattern.lastIndex = 0;
  if (!pattern.test(text)) errors.push(message);
}

function auditFrameMeasurementLaw(errors, text, label) {
  for (const [pattern, requirement] of FRAME_MEASUREMENT_LAW) {
    requirePattern(errors, text, pattern, `${label} canonical frame-measurement law is missing ${requirement}`);
  }
  if (FRAME_MEASUREMENT_SUBSTITUTE.test(text)) {
    errors.push(`${label} canonical frame-measurement law contains a forbidden tolerance/window/normalization substitute`);
  }
}


function headingSections(text, pattern) {
  const matches = [...text.matchAll(pattern)];
  return matches.map((match, index) => ({
    heading: match[0],
    body: text.slice(match.index, matches[index + 1]?.index ?? text.length),
  }));
}

function exactSequence(prefix, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}`);
}

function checkIds(errors, label, actual, expected) {
  const missing = expected.filter((id) => !actual.includes(id));
  const extra = actual.filter((id) => !expected.includes(id));
  if (missing.length || extra.length || actual.length !== expected.length) {
    errors.push(`${label} must contain exactly ${expected.length} unique IDs; missing=[${missing.join(', ')}], extra=[${extra.join(', ')}]`);
  }
}

export function auditWorldEngineBundle(bundle) {
  const errors = auditCatalogIntegrity(bundle);
  const worldIds = uniqueMatches(
    bundle.worlds ?? '',
    /\b((?:world\.[a-z0-9-]+\.[a-z0-9-]+)|(?:WORLD-\d{2}))\b/g,
  );
  const familyIds = uniqueMatches(bundle.worlds ?? '', /\bworld\.([a-z0-9-]+)\.[a-z0-9-]+\b/g);
  const fallbackFamilyIds = uniqueMatches(bundle.worlds ?? '', /\bFAMILY-([A-Z-]+)\b/g)
    .map((value) => value.toLowerCase());
  const effectiveFamilyIds = familyIds.length ? familyIds : fallbackFamilyIds;
  const techniqueIds = uniqueMatches(bundle.techniques ?? '', /\b(WFX-\d{2})\b/g);
  const psychologyIds = uniqueMatches(bundle.psychology ?? '', /\b(PSY-\d{2})\b/g);
  const worldEntries = headingSections(bundle.worlds ?? '', /^###\s+\d+\.\s+.+$/gm);
  const techniqueEntries = headingSections(bundle.techniques ?? '', /^##\s+WFX-\d{2}\b.*$/gm);
  const psychologyEntries = headingSections(bundle.psychology ?? '', /^###\s+PSY-\d{2}\b.*$/gm);

  if (worldIds.length !== 18) {
    errors.push(`world catalog must contain exactly 18 unique world IDs; found ${worldIds.length}`);
  }
  if (effectiveFamilyIds.length !== 5) {
    errors.push(`world catalog must contain exactly 5 family IDs; found ${effectiveFamilyIds.length}`);
  } else if (familyIds.length) {
    const missingFamilies = EXPECTED_WORLD_FAMILIES.filter((id) => !familyIds.includes(id));
    if (missingFamilies.length) errors.push(`world family IDs missing: ${missingFamilies.join(', ')}`);
  }
  checkIds(errors, 'technique catalog', techniqueIds, exactSequence('WFX', 13));
  checkIds(errors, 'psychology catalog', psychologyIds, exactSequence('PSY', 10));

  requirePattern(errors, bundle.worlds ?? '', /Glacier Cathedral[\s\S]*Gold exemplar/i, 'Glacier Cathedral gold exemplar is missing');
  requirePattern(errors, bundle.worlds ?? '', /Neon Meridian[\s\S]*Gold exemplar/i, 'Neon Meridian gold exemplar is missing');
  requirePattern(errors, bundle.worlds ?? '', /Anti-cheese/gi, 'world catalog needs explicit anti-cheese lines');
  requirePattern(errors, bundle.worlds ?? '', /Catalog version/i, 'world catalog version is missing');
  requirePattern(errors, bundle.worlds ?? '', /suitability-filtered[\s\S]*seed/i, 'world roulette must be suitability-filtered and seeded');
  if (worldEntries.length !== 18) errors.push(`per-entry world schema requires 18 numbered entries; found ${worldEntries.length}`);
  if (/\?/.test(bundle.worlds ?? '')) errors.push('world catalog contains literal ? replacement corruption');
  const worldLabels = ['Name + family', 'World DNA', 'Audience + content fit', 'Palette law + world palette', 'Atmosphere recipe', 'Motion language + typography lean', 'Signature WFX + backend ladder', 'Seedance seed brief', 'Asset provenance', 'Psychology hypotheses', 'Proof + action contract', 'Reduced-motion still'];
  const worldGenes = ['material =', 'light =', 'weather =', 'camera =', 'depth =', 'topology =', 'interaction =', 'sonic-silence =', 'primary gene =', 'opt-in accent world ='];
  for (const entry of worldEntries) {
    const missingLabels = worldLabels.filter((label) => !entry.body.includes(`**${label}`));
    const missingGenes = worldGenes.filter((gene) => !entry.body.toLowerCase().includes(gene));
    const entryWorldIds = uniqueMatches(entry.body, /\b(world\.[a-z0-9-]+\.[a-z0-9-]+)\b/g);
    const entryWfx = uniqueMatches(entry.body, /\b(WFX-\d{2})\b/g);
    const entryPsy = uniqueMatches(entry.body, /\b(PSY-\d{2})\b/g);
    if (missingLabels.length || missingGenes.length || entryWorldIds.length !== 1 || entryWfx.length < 2 || entryWfx.length > 4 || entryPsy.length !== 3 || !/\bB0\b/.test(entry.body) || !/Anti-cheese/i.test(entry.body)) {
      errors.push(`per-entry world schema incomplete: ${entry.heading}; labels=[${missingLabels.join(', ')}], genes=[${missingGenes.join(', ')}], IDs=${entryWorldIds.length}, WFX=${entryWfx.length}, PSY=${entryPsy.length}`);
    }
  }

  if (VISUAL_TIER_COLLISION.test(bundle.techniques ?? '')) {
    errors.push('techniques.md contains a visual T1-T13 collision with Hermes effect tiers');
  }
  requirePattern(errors, bundle.techniques ?? '', /B0[\s\S]*B1[\s\S]*B2[\s\S]*B3/i, 'technique render ladder B0-B3 is incomplete');
  requirePattern(errors, bundle.techniques ?? '', /Full[\s\S]*Lean[\s\S]*Still/i, 'technique Full/Lean/Still contracts are incomplete');
  requirePattern(errors, bundle.techniques ?? '', /DEPENDENCY-GATED/i, 'technique dependency maturity is not explicit');
  requirePattern(errors, bundle.techniques ?? '', /device\.lost|device loss/i, 'WebGPU device-loss recovery is missing');
  auditFrameMeasurementLaw(errors, bundle.techniques ?? '', 'techniques.md');
  if (techniqueEntries.length !== 13) errors.push(`per-entry WFX schema requires 13 entries; found ${techniqueEntries.length}`);
  for (const entry of techniqueEntries) {
    const required = [/\| Job \/ payoff \|/i, /\| Budget \/ maturity \|/i, /\| Backend rungs \|[\s\S]*\bB0\b[\s\S]*\bB1\b[\s\S]*\bB2\b[\s\S]*\bB3\b/i, /\| Full \/ Lean \/ Still \|/i, /\| Recovery \|/i, /\| A11y \/[^|]+\|/i, /\| Wrong tool \|/i];
    if (required.some((pattern) => !pattern.test(entry.body))) errors.push(`per-entry WFX schema incomplete: ${entry.heading}`);
  }

  requirePattern(errors, bundle.psychology ?? '', /\[HYPOTHESIS\]/i, 'psychology claims must be labeled hypotheses');
  requirePattern(errors, bundle.psychology ?? '', /falsif/i, 'psychology falsification criteria are missing');
  requirePattern(errors, bundle.psychology ?? '', /counter-metric/i, 'psychology counter-metrics are missing');
  requirePattern(errors, bundle.psychology ?? '', /dark.pattern|ethical/i, 'psychology ethical guardrails are missing');
  if (psychologyEntries.length !== 10) errors.push(`per-entry PSY schema requires 10 entries; found ${psychologyEntries.length}`);
  for (const entry of psychologyEntries) {
    const required = ['Definition - researcher - source', 'Evidence strength / caveat', 'Audience / context', 'Swan anchor', 'World Engine use', 'Accessibility + ethical failure', 'Target KPI / counter-metric', 'Falsifier', 'Stop'];
    if (required.some((field) => !entry.body.includes(`| ${field} |`)) || !/\[HYPOTHESIS\]/.test(entry.heading)) errors.push(`per-entry PSY schema incomplete: ${entry.heading}`);
  }

  const experience = bundle.experience ?? '';
  requirePattern(errors, experience, /LIVE M4 NEVER/i, 'experience firewall must say LIVE M4 NEVER for product/Hermes surfaces');
  requirePattern(errors, experience, /product[\s\S]*Hermes|Hermes[\s\S]*product/i, 'experience firewall must cover product and Hermes surfaces');
  requirePattern(errors, experience, /B0[\s\S]*B1[\s\S]*B2[\s\S]*B3/i, 'experience render ladder B0-B3 is incomplete');
  requirePattern(errors, experience, /Full[\s\S]*Lean[\s\S]*Still/i, 'experience quality modes are incomplete');
  requirePattern(errors, experience, /Reduced Motion/i, 'Reduced Motion override is missing');
  requirePattern(errors, experience, /Pause Effects/i, 'Pause Effects control is missing');
  requirePattern(errors, experience, /Law A[\s\S]*Law B/i, 'Palette Law A/B boundary is missing');
  requirePattern(errors, experience, /promotes? the (?:whole )?host|host.*inherit/i, 'M4 host inheritance is missing');
  auditFrameMeasurementLaw(errors, experience, 'experience-mode.md');
  const handoff = bundle.handoff ?? ''; requirePattern(errors, handoff, /presentation cadence, not authored work/i, 'handoff must preserve the presentation-cadence versus authored-work boundary');
  if (HANDOFF_FRAME_SUBSTITUTE.test(handoff)) errors.push('handoff contains a forbidden frame-measurement substitute');

  requirePattern(errors, bundle.router ?? '', /world-roulette\.v1[\s\S]*NFC[\s\S]*SHA-256[\s\S]*ASCII/i, 'router must require the exact world-roulette.v1 algorithm');
  requirePattern(errors, bundle.router ?? '', /Law B[\s\S]*Swan/i, 'router lacks Law-B-under-Swan refusal');
  requirePattern(errors, bundle.router ?? '', /M4[\s\S]*product/i, 'router lacks M4 product refusal');
  requirePattern(errors, bundle.router ?? '', /B0/i, 'router lacks semantic B0 requirement');

  requirePattern(errors, bundle.factory ?? '', /manual-only/i, 'factory must be manual-only');
  requirePattern(errors, bundle.factory ?? '', /world-roulette\.v1[\s\S]*platform PRNG/i, 'factory must require the exact world-roulette.v1 algorithm');
  requirePattern(errors, bundle.factory ?? '', /git check-ignore/i, 'factory must fail closed unless its output is ignored');
  requirePattern(errors, bundle.factory ?? '', /Three hostile repair passes/i, 'factory must run three hostile repair passes');
  requirePattern(errors, bundle.factory ?? '', /Browser verification/i, 'factory must require real browser verification');
  requirePattern(errors, bundle.factory ?? '', /reviewedArtifact[\s\S]*sha256-canonical-reviewed-artifact\.v1[\s\S]*material change[\s\S]*invalidat/i, 'factory reviewedArtifact material change invalidation contract is incomplete');
  requirePattern(errors, bundle.factory ?? '', /(?=[\s\S]*predeclared `reviewPolicy`)(?=[\s\S]*swan-world-factory\.review-policy\.v2)(?=[\s\S]*workerAssignments)(?=[\s\S]*browserQaWorker)(?=[\s\S]*minimum cycle)(?=[\s\S]*same QA worker)(?=[\s\S]*hashed[\s\S]*screenshot)(?=[\s\S]*reviewedBrowserEvidence)(?=[\s\S]*raw LCP)(?=[\s\S]*runner-owned ephemeral loopback)(?=[\s\S]*gallery-only)/i, 'factory evidence-bound independent review sequence is incomplete');
  requirePattern(errors, bundle.registry ?? '', /swan-world-factory[\s\S]*T1[\s\S]*T2[\s\S]*MANUAL ONLY/i, 'factory registry boundary is incomplete');
  requirePattern(errors, bundle.archetypes ?? '', /(?:21\. Experience \/ World Showcase|\| 21 \| Experience \/ World Showcase)[\s\S]*live M4/i, 'archetype #21 M4 firewall is incomplete');
  requirePattern(errors, bundle.sourceSystem ?? '', /Licensed M4 delegation[\s\S]*product/i, 'cinematic source lacks narrow M4 delegation');
  requirePattern(errors, bundle.sourceAssets ?? '', /Licensed M4 exception[\s\S]*product/i, 'asset source lacks narrow M4 exception');
  requirePattern(errors, bundle.knowledge ?? '', /World(?:Recipe|Family)|World DNA/i, 'knowledge adapter lacks World Engine entities');
  requirePattern(errors, bundle.knowledge ?? '', /quarantine/i, 'knowledge adapter lacks quarantine routing');
  requirePattern(errors, bundle.knowledge ?? '', /direct(?:-to-|\s+)wiki\s+writ/i, 'knowledge adapter must prohibit direct wiki writes');
  requirePattern(errors, bundle.index ?? '', /worlds\.md[\s\S]*techniques\.md[\s\S]*psychology\.md[\s\S]*experience-mode\.md[\s\S]*swan-world-factory/i, 'Design Brain index lacks complete World Engine stitching');
  requirePattern(errors, bundle.designMd ?? '', /Full\/Lean\/Still[\s\S]*Reduced Motion is a separate accessibility override/i, 'design.md must define Full/Lean/Still plus separate Reduced Motion');
  // design.html assertions REMOVED 2026-08-16: the mirror was retired to docs/_attic/. Keeping
  // them turned a real pre-existing failure ("external-reference receipt/fallback contract is
  // incomplete") into an ENOENT crash that MASKED it — same failure count, worse information.
  // design.md carries the Full/Lean/Still + Reduced-Motion contract on its own, asserted above.
  //
  // The retired design-mirror-check.mjs asserted TWO things, and only one died with its subject:
  // (a) every canonical token in design.md also appears in design.html — dead, no mirror exists;
  // (b) design.md yields >= 20 canonical tokens at all — a PALETTE-EXTRACTION SANITY check whose
  // subject is still very much alive. Deleting the script silently dropped (b) (Kimi round 2,
  // R2-1). Re-asserted here so a design.md that stops yielding a palette still fails loudly.
  const canonicalTokens = new Set((bundle.designMd ?? '').match(/#[0-9A-Fa-f]{6}\b/g) ?? []);
  if (canonicalTokens.size < 20) {
    errors.push(`design.md canonical palette extraction found only ${canonicalTokens.size} unique hex tokens (expected >= 20)`);
  }
  // NEGATIVE sentinel, re-homed from the deleted design.html check (GLM round 2, R2-5). It guards
  // the RETIRED "Reduced-Motion-as-a-fourth-tier" contract from creeping back. The surviving
  // positive assertion above states what canon must say; this states what it must NOT say, and a
  // positive check cannot catch a contradiction sitting beside it.
  if (/Tier 3 — Reduced motion/i.test(bundle.designMd ?? '')) {
    errors.push('design.md retains the retired Reduced-Motion-as-tier contract');
  }
  requirePattern(errors, bundle.motion ?? '', /Licensed M4 pointer[\s\S]*Full\/Lean\/Still/i, 'motion doctrine lacks M4 and runtime-mode stitching');
  requirePattern(errors, bundle.cinematic ?? '', /M4 loss-matrix pointer[\s\S]*B3 failure[\s\S]*B1\/B0/i, 'cinematic doctrine lacks M4 backend-loss stitching');
  requirePattern(errors, bundle.reviewers ?? '', /M4 license and failure safety[\s\S]*automatic REVISE/i, 'reviewer adapter lacks M4 automatic-REVISE gate');
  requirePattern(errors, bundle.reviewers ?? '', /reviewedArtifact[\s\S]*material change[\s\S]*invalidat/i, 'reviewer adapter lacks reviewedArtifact material change invalidation');
  requirePattern(errors, bundle.reviewers ?? '', /(?=[\s\S]*\*\*M4 identity policy\*\*)(?=[\s\S]*swan-world-factory\.review-policy\.v2)(?=[\s\S]*browserQaWorker)(?=[\s\S]*same predeclared QA worker)(?=[\s\S]*reviewedBrowserEvidence)(?=[\s\S]*runner-owned loopback)(?=[\s\S]*raw LCP)(?=[\s\S]*hashed\/decoded)(?=[\s\S]*gallery-only)/i, 'reviewer adapter evidence-bound independent review sequence is incomplete');
  requirePattern(errors, bundle.externalReference ?? '', /MOBBIN UNAVAILABLE[\s\S]*principles/i, 'external-reference receipt/fallback contract is incomplete');
  requirePattern(errors, bundle.rouletteTest ?? '', /count:\s*7/i, 'roulette regression test must cover multi-cycle selection');
  requirePattern(errors, bundle.rouletteTest ?? '', /restrainedAlternate/i, 'roulette regression test must cover restrained alternate');

  for (const [name, text] of Object.entries(bundle)) {
    if (MOJIBAKE.test(text ?? '')) errors.push(`${name} contains encoding damage/mojibake`);
    if (PLACEHOLDER.test(text ?? '')) errors.push(`${name} contains an unfinished placeholder`);
  }

  return {
    ok: errors.length === 0,
    errors,
    metrics: {
      worlds: worldIds.length,
      worldFamilies: effectiveFamilyIds.length,
      familyIds: effectiveFamilyIds,
      techniques: techniqueIds.length,
      psychologyPrinciples: psychologyIds.length,
    },
  };
}

export async function verifyWorldEngine({ root = process.cwd() } = {}) {
  const bundle = {};
  const errors = [];

  for (const [key, relativePath] of Object.entries(REQUIRED_FILES)) {
    try {
      bundle[key] = await fs.readFile(path.join(root, relativePath), 'utf8');
    } catch (error) {
      errors.push(`missing required file: ${relativePath} (${error.code ?? error.message})`);
      bundle[key] = '';
    }
  }

  const report = auditWorldEngineBundle(bundle);
  const rouletteErrors = await verifyRouletteImplementation({ root });
  const allErrors = [...errors, ...report.errors, ...rouletteErrors];
  return { ...report, ok: allErrors.length === 0, errors: allErrors };
}

function printReport(report) {
  console.log(`World Engine contract: ${report.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Worlds: ${report.metrics.worlds}/18 across ${report.metrics.worldFamilies}/5 families`);
  console.log(`Techniques: ${report.metrics.techniques}/13`);
  console.log(`Psychology: ${report.metrics.psychologyPrinciples}/10`);
  for (const error of report.errors) console.error(`- ${error}`);
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const rootArg = args.find((arg) => arg.startsWith('--root='));
  const root = rootArg ? path.resolve(rootArg.slice('--root='.length)) : process.cwd();
  const report = await verifyWorldEngine({ root });
  console.log(json ? JSON.stringify(report, null, 2) : (printReport(report) ?? ''));
  if (!report.ok) process.exitCode = 1;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
