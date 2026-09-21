/**
 * mega-blueprint-mandate.mjs — the one-keyword Mega Blueprint arming module.
 * ==========================================================================
 * Sean, 2026-09-19:
 *
 *   "it is mandatory that when we run astra. astra is to know that we are using
 *    the mega blueprint skill and that means that it needs to update whatever
 *    blueprints wireframe flowchart mermaids and tests and any other documents
 *    related to the documentation of whatever we are building this is a must so
 *    that i get the most out of every call it needs to hostile review the
 *    blueprints it has as well as the one it suggests and creates one time just
 *    for extra hardening this will be all done automatically in the background
 *    with just the key word Mega Blueprint printed once before the different
 *    actions"
 *
 * WHAT THIS MODULE IS. A detector plus a mandate builder. The operator prints the
 * phrase once; the harness prints the banner once; everything else is automatic.
 * The mandate is injected into the model's prompt, so the model is told which
 * skill governs it and exactly which artifacts it owes.
 *
 * WHY IT IS A MODULE AND NOT A PARAGRAPH IN A SCRIPT. This repo's own corpus records
 * prose rules being violated four times in one session after being written up, so the
 * behaviour lives in one imported definition rather than being restated per caller.
 *
 * COVERAGE — MEASURED, NOT ASSUMED (2026-09-19). Three scripts can reach Astra:
 *
 *   consult-astra-subscription.mjs   ARMED   (ChatGPT subscription, $0)
 *   consult-astra-pro.mjs            ARMED   (OpenRouter, paid, double-gated)
 *   consult-astra-multihost.mjs      UNARMED (OpenRouter, paid, double-gated)
 *
 * An earlier draft of this comment claimed "four consult scripts share this behaviour".
 * That was false — one did — and it was false in the most expensive direction: it read
 * as coverage, so nobody would check. The claim is now a test rather than a sentence:
 * `mega-blueprint-coverage.test.mjs` fails when an Astra-reaching script is added without
 * arming, and pins the remaining exemption by name with its reason.
 *
 * `consult-astra-pro.mjs` was exempt and is now armed: its contract is already Forge-shaped
 * (`## PART A — HOSTILE REVIEW`), it routes through `fetchForEgress` so the egress
 * chokepoint covers it, and its dry-run makes arming provable without spending.
 * `consult-astra-multihost.mjs` stays exempt because it declares a DIFFERENT output contract
 * (`## PART A — MULTI-HOST ARCHITECTURE`); arming it is a design change, not a wiring change,
 * and the exemption is asserted exactly so it cannot be forgotten or silently widened.
 *
 * THE OUTPUT CONTRACT IS NOT DECORATION. `scripts/split-astra-blueprint.mjs`
 * decomposes the reply mechanically: it needs `## PART A/B/C` at fence depth 0
 * and `### NN-name.md` level-3 headings inside PART B. If the mandate drifts
 * from that shape, the splitter exits non-zero and the paid reply is wasted.
 * The two files are therefore tested against each other.
 */

/** The literal trigger. Case-insensitive; internal horizontal whitespace tolerated. */
import { MEGA_BLUEPRINT_SCOPE_BOUND } from './mega-blueprint-scope.mjs';
export { MEGA_BLUEPRINT_SCOPE_BOUND };

export const MEGA_BLUEPRINT_KEYWORD = 'Mega Blueprint';

/** Printed exactly once, before the action list. */
export const MEGA_BLUEPRINT_BANNER = 'MEGA BLUEPRINT';

/** The `fable-blueprint-forge` package — the eight canonical docs. */
export const FORGE_DOCS = [
  '00-README.md', '01-architecture.md', '02-wireframes.md', '03-contracts.md',
  '04-build-order.md', '05-slices.md', '06-bans.md', '07-checkpoints.md',
];

/**
 * Mega Blueprint mode adds a dedicated test plan. The Forge keeps acceptance
 * criteria inside `05-slices.md`; Sean names tests as an artifact in their own
 * right, so they get their own document rather than being a paragraph.
 */
export const MEGA_BLUEPRINT_EXTRA_DOCS = ['09-tests.md'];

/** Every document a Mega Blueprint reply must contain, in emission order. */
export const MEGA_BLUEPRINT_REQUIRED_DOCS = [...FORGE_DOCS, ...MEGA_BLUEPRINT_EXTRA_DOCS];

/** The five actions the banner lists. One copy, so every caller prints the same list. */
export const MEGA_BLUEPRINT_ACTIONS = [
  'documentation refresh — blueprints, wireframes, flowcharts, mermaid, tests, other docs',
  'hostile review A1 — the existing blueprints in the packet',
  'hostile review A2 — its own draft, ONE pass, for extra hardening',
  'decision-density self-test (PART C)',
  'emit under the PART A / PART B / PART C contract',
];

/**
 * The keyword explanation the consult scripts print in `usage()`. It was copied verbatim
 * into two usage blocks until round 7, and extracted for the same reason as the arming
 * logic: two copies agree until someone edits one. Returns lines, so callers spread it.
 */
export const megaBlueprintUsage = () => [
  '',
  `MEGA BLUEPRINT: print the keyword "${MEGA_BLUEPRINT_KEYWORD}" once — in the remit or anywhere in`,
  'the document — and the full pipeline arms automatically: documentation refresh (blueprints,',
  'wireframes, flowcharts, mermaid, tests, other docs), a hostile review of the EXISTING blueprints,',
  'a second hostile review of its own package for extra hardening, and the decision-density',
  'self-test. Use --mega-blueprint to force it on, --no-mega-blueprint to force it off.',
  'A dry-run proves the mandate reached the prompt (contract_headings_present=...) before you spend.',
];

/**
 * The six artifact classes Sean named, each mapped to where it lands. Kept as
 * data so a test can assert the mandate actually names all six.
 */
export const REQUIRED_ARTIFACT_CLASSES = [
  { key: 'blueprints', doc: '00/01/04/05/06/07', demands: 'architecture, build order, slices and bans — the plan package itself' },
  { key: 'wireframes', doc: '02-wireframes.md', demands: 'every screen and state, desktop AND 375px mobile, exact copy strings and exact palette tokens' },
  { key: 'flowcharts', doc: '01-architecture.md', demands: 'user and data flows, per screen and per subsystem' },
  { key: 'mermaid', doc: '01-architecture.md', demands: 'literal mermaid blocks: flowchart, sequenceDiagram per API interaction, erDiagram with exact column names and types, stateDiagram where state machines exist' },
  { key: 'tests', doc: '09-tests.md', demands: 'named test files, named cases, the exact command, and what each case proves' },
  { key: 'other-docs', doc: '03-contracts.md', demands: 'contracts, migrations, env vars, rollback — anything else the work needs documented' },
];

/**
 * `Mega   BluePrint` matches; `MegaBlueprint` does not (a phrase, not a token).
 * Horizontal whitespace only — `\s` would also match a newline, so a document
 * that happened to end a line with "Mega" and start the next with "Blueprint"
 * would arm a paid pipeline by accident. A keyword is a phrase on one line.
 *
 * U+00A0 IS INCLUDED ON PURPOSE. A non-breaking space is what you get when the
 * phrase is copied out of a rendered web page or a PDF, and it is visually
 * identical to a normal space. A false NEGATIVE here is the worse direction:
 * the operator believes the pipeline is armed and gets a bare reply instead.
 * A false POSITIVE only costs a longer (still $0) answer, and
 * `--no-mega-blueprint` is the escape hatch.
 */
const KEYWORD_RE = new RegExp(MEGA_BLUEPRINT_KEYWORD.replace(/\s+/g, '[ \\t\\u00a0]+'), 'i');

/**
 * A blueprint reference is interpolated into the mandate, so it must not be able
 * to carry markdown structure into the prompt. A path containing a newline and a
 * literal `## PART A — HOSTILE REVIEW` would otherwise inject a fake output-contract
 * heading — the one thing the mandate promises cannot drift.
 *
 * THE CHARACTER CLASS IS THE WHOLE POINT. A first attempt stripped only
 * `` ` \r \n \t ``. Two holes survived, both proven by probe:
 *
 *   1. U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR. JS `\s` matches them,
 *      so the `\s{2,}` collapse pass never sees a LONE separator, and the first
 *      class did not include them. A path carrying one kept a live line break.
 *   2. Nothing at all stripped C0 controls — `\v`, `\f`, NUL — any of which a
 *      downstream markdown reader may treat as a break.
 *
 * So the rule is now stated positively: strip every control character, both
 * Unicode line terminators, and the backtick that would close the slot this value
 * is rendered into. Then collapse the remaining whitespace runs.
 */
export const safeRef = (value) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f\u2028\u2029`]+/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

/**
 * Does any supplied text carry the keyword?
 * Returns where it was found so the caller can report honestly, rather than
 * claiming a mode was armed on the strength of a boolean.
 *
 * @returns {{armed: boolean, foundIn: string[]}}
 */
export function detectMegaBlueprint(...texts) {
  const foundIn = [];
  const labels = ['remit', 'document'];
  texts.forEach((text, i) => {
    if (text && KEYWORD_RE.test(String(text))) foundIn.push(labels[i] || `text${i}`);
  });
  return { armed: foundIn.length > 0, foundIn };
}

/** The banner, printed ONCE, immediately before the action list. */
export function formatMegaBlueprintBanner(actions = []) {
  return [
    MEGA_BLUEPRINT_BANNER,
    '  keyword printed once — the full documentation + double-hostile-review pipeline is armed',
    ...actions.map((a, i) => `  ${i + 1}. ${a}`),
  ].join('\n');
}

/**
 * The mandate injected into the model's prompt.
 *
 * @param {{existingBlueprints?: string[], packet?: string}} opts
 */
export function buildMegaBlueprintMandate({ existingBlueprints = [], packet = '', bounded = false } = {}) {
  const artifacts = REQUIRED_ARTIFACT_CLASSES
    .map((a, i) => `  ${i + 1}. ${a.key.toUpperCase().padEnd(12)} -> \`${a.doc}\` — ${a.demands}`)
    .join('\n');
  const docs = MEGA_BLUEPRINT_REQUIRED_DOCS.map((d) => `  ### ${d}`).join('\n');
  const reviewTargets = existingBlueprints.length
    ? existingBlueprints.map((b) => `  - \`${safeRef(b)}\``).join('\n')
    : '  - every blueprint, wireframe, diagram and test plan supplied in the packet';

  const scopeBound = bounded ? MEGA_BLUEPRINT_SCOPE_BOUND : '';
  return `MEGA BLUEPRINT MODE — ARMED (mandatory; not optional, not partial)

The operator printed the keyword "Mega Blueprint" once. That single keyword arms everything
below. You are operating under the \`fable-blueprint-forge\` skill. Read the packet as the
source of truth for WHAT is being built; this mandate governs HOW you must document it.

=== MANDATE 1 — DOCUMENTATION REFRESH: UPDATE, DO NOT MERELY DESCRIBE ===
Emit UPDATED artifacts for the work being built. A summary of a document is not the
document. A prose description of a diagram is not a diagram. All six classes are required:

${artifacts}

A class may be answered \`N/A — <reason>\` ONLY when the work genuinely has no surface for
it, and the reason must name what is absent (e.g. "N/A — headless helper, no screens, no
palette tokens"). That is a legitimate answer, not a gap. What is NOT legitimate:
  - silently omitting a class, or leaving its document empty;
  - inventing a screen, a diagram or a test so the list looks satisfied.
An unjustified omission is a contract failure. An honest N/A is not.

Diagrams must be literal fenced \`\`\`mermaid blocks. Wireframes must be ASCII or HTML with
exact copy strings and exact palette tokens. Tests must be named and runnable, not "add tests".

=== MANDATE 2 — HOSTILE REVIEW, BOTH PASSES ===
Two passes. Both go in PART A. Neither is skippable.

  A1 — REVIEW OF THE EXISTING BLUEPRINTS. The blueprints you already hold are REVIEW
       TARGETS, not background reading:
${reviewTargets}
       Attack them: contradictions between documents, diagrams that disagree with the real
       schema, slices whose acceptance criteria cannot be executed, decisions stated but
       never enforced, bans that contradict the plan. Every finding carries \`file:line\` or
       \`doc#section\` evidence plus a concrete fix. A finding without a fix is not a finding.

  A2 — REVIEW OF YOUR OWN PACKAGE. ONE PASS, FOR EXTRA HARDENING. Draft the package
       FIRST, then turn on it as a hostile reviewer and attack your own draft: silent gaps a
       builder would have to fill with its own judgment, decisions deferred without bounds,
       diagrams that do not match your own contracts, tests that could pass while the feature
       is broken, internal inconsistencies. This pass runs ONCE.
       Its findings MUST be reflected in the package you emit. A self-review that changes
       nothing is evidence the pass did not run.

If A2 invalidates part of your draft, PART B reflects the FIX, not the draft.

=== MANDATE 3 — DECISION-DENSITY SELF-TEST (PART C) ===
List every choice a hostile builder would still have to make. Each is either decided in the
package, or explicitly delegated WITH BOUNDS. Zero silent gaps.

=== OUTPUT CONTRACT — the splitter depends on it; do not vary it ===
Emit these three level-2 headings, in this order, at fence depth 0:
  ## PART A — HOSTILE REVIEW
  ## PART B — FORGED PACKAGE
  ## PART C — DECISION-DENSITY SELF-TEST

Inside PART B, emit exactly these level-3 headings, in this order:
${docs}

Headings are only honoured at fence depth 0. Never place a required heading inside a
\`\`\` code block — the splitter ignores anything fenced, and a fenced heading means a
missing document and a wasted call.

Do NOT restate this mandate or the packet back to the operator. Spend every token on
decisions and findings.${scopeBound}${packet ? `\n\nPacket: \`${safeRef(packet)}\`` : ''}`;
}

/**
 * Resolve arming AND build the prompt in one call, so every Astra entry point arms
 * identically. This is the module's whole reason for existing, applied to the last
 * piece of logic that was still copied per caller.
 *
 * EXTRACTED (round-7 finding, 2026-09-19). The arming block was inlined in each script,
 * and inlining it pushed `consult-astra-pro.mjs` to 318 lines against Rule 4's 300-line
 * cap. Extracting is the fix that is better than line-golf: it removes a second copy of
 * the logic, which is the drift this module was built to prevent.
 *
 * `tail` exists because callers append different closing instructions; it is the ONLY
 * sanctioned variation. `flag` is tri-state — `null` auto-detects, `true`/`false` force.
 *
 * @returns {{armed: boolean, armedBy: string[], banner: string|null, mandate: string|null, prompt: string}}
 */
export function armMegaBlueprintPrompt({ remit, document, packet = null, flag = null, tail = '', bounded = false } = {}) {
  const detection = detectMegaBlueprint(remit, document);
  const armed = flag === null ? detection.armed : flag;
  const packetBlock = `${remit}\n\n=== BEGIN PACKET ===\n\n${document}\n\n=== END PACKET ===${tail}`;

  if (!armed) {
    // An unarmed call carries no mandate, so it can carry no scope bound either.
    return { armed: false, armedBy: [], banner: null, mandate: null, bounded: false, prompt: packetBlock };
  }
  const mandate = buildMegaBlueprintMandate({ packet, bounded });
  return {
    armed: true,
    armedBy: flag === true ? ['operator flag'] : detection.foundIn,
    banner: formatMegaBlueprintBanner(MEGA_BLUEPRINT_ACTIONS),
    mandate,
    bounded: Boolean(bounded),
    prompt: `${mandate}\n\n=== REMIT ===\n\n${packetBlock}`,
  };
}

export default {
  MEGA_BLUEPRINT_KEYWORD, MEGA_BLUEPRINT_BANNER, FORGE_DOCS,
  MEGA_BLUEPRINT_EXTRA_DOCS, MEGA_BLUEPRINT_REQUIRED_DOCS, REQUIRED_ARTIFACT_CLASSES,
  MEGA_BLUEPRINT_ACTIONS, MEGA_BLUEPRINT_SCOPE_BOUND, safeRef, detectMegaBlueprint, formatMegaBlueprintBanner,
  buildMegaBlueprintMandate, armMegaBlueprintPrompt,
};
