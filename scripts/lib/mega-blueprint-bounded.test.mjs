import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MEGA_BLUEPRINT_REQUIRED_DOCS, buildMegaBlueprintMandate, armMegaBlueprintPrompt,
} from './mega-blueprint-mandate.mjs';

// ------------------------------------------------- bounded scope (2026-09-20)
//
// MEASURED, not theorised. Two runs of the same seat at the same effort, packets of the same
// order of size, one variable changed — an explicit bound forbidding file exploration:
//
//   unbounded   547,783 input tokens   520.5 s   (of a 600 s cap)
//   --bounded    38,622 input tokens   321.9 s
//
// 14.2x the tokens and 1.6x the wall time, with no loss of answer quality. (An earlier
// "18.4x / 7.5x" compared two DIFFERENT packets and overstated the effect; the figures here
// change one variable only.) The cost that
// matters is not tokens ($0 on the subscription) — it is that four consecutive dispatches
// died at the cap before a bounded one returned. The unbounded hunt is what the mandate is
// FOR and it must stay the default; bounded is the opt-in for consults that need reasoning
// rather than a repository crawl.

test('bounded mode is OFF by default — the hunt is the point of the mandate', () => {
  const mandate = buildMegaBlueprintMandate({ packet: 'x' });
  assert.ok(!/SCOPE BOUND/.test(mandate), 'the default mandate must not restrict exploration');
});

test('bounded mode forbids exploration in terms a model cannot read as advisory', () => {
  const mandate = buildMegaBlueprintMandate({ packet: 'x', bounded: true });
  assert.match(mandate, /SCOPE BOUND/);
  // The specific verbs matter: "do not explore" is ignorable, an enumerated ban is not.
  for (const verb of [/\bread\b/i, /\bsearch\b/i, /\blist\b/i]) assert.match(mandate, verb);
  assert.match(mandate, /N\/A/, 'it must say how to answer the artifact classes it cannot research');
});

test('bounded mode keeps the output contract the splitter depends on', () => {
  // A bound that dropped PART A/B/C would save tokens by breaking split-astra-blueprint.mjs.
  const mandate = buildMegaBlueprintMandate({ packet: 'x', bounded: true });
  for (const part of ['PART A', 'PART B', 'PART C']) assert.ok(mandate.includes(part), `${part} must survive bounding`);
  for (const doc of MEGA_BLUEPRINT_REQUIRED_DOCS) assert.ok(mandate.includes(doc), `${doc} must still be demanded`);
});

test('bounded mode still demands both hostile reviews', () => {
  // The whole value of the seat is the adversarial pass. Bounding scope must not bound rigour.
  const mandate = buildMegaBlueprintMandate({ packet: 'x', bounded: true });
  assert.match(mandate, /A1/);
  assert.match(mandate, /A2/);
});

test('armMegaBlueprintPrompt threads bounded through to the prompt', () => {
  const armed = armMegaBlueprintPrompt({ remit: 'r', document: 'd', flag: true, bounded: true });
  assert.equal(armed.armed, true);
  assert.equal(armed.bounded, true, 'callers need to report which mode actually ran');
  assert.match(armed.prompt, /SCOPE BOUND/);

  const unbounded = armMegaBlueprintPrompt({ remit: 'r', document: 'd', flag: true });
  assert.equal(unbounded.bounded, false);
  assert.ok(!/SCOPE BOUND/.test(unbounded.prompt));
});

test('bounded has no effect when the mandate is not armed', () => {
  // Bounding an unarmed call must not smuggle mandate text into a plain consult.
  const off = armMegaBlueprintPrompt({ remit: 'r', document: 'd', flag: false, bounded: true });
  assert.equal(off.armed, false);
  assert.equal(off.bounded, false);
  assert.ok(!/SCOPE BOUND/.test(off.prompt));
});
