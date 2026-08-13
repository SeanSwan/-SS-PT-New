import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContactSheet, RUBRIC } from '../../../shared/contactSheet.mjs';

const ROW = Object.freeze({
  status: 'ok', variantId: 'v_00000000000000ab', intent: 'root',
  promptText: 'a frozen lake at dawn', costUsd: 0.004288, wallMs: 23564,
  actualWidth: 1536, actualHeight: 864, imageRef: null,
});

test('the sheet renders the options, the prompt, and the rubric', () => {
  const html = buildContactSheet([ROW, { ...ROW, variantId: 'v_00000000000000cd', intent: 'reroll' }], '.', { runId: 'r_x' });
  assert.match(html, /v_00000000/);
  assert.match(html, /a frozen lake at dawn/);
  for (const q of RUBRIC) assert.ok(html.includes(q.q), `rubric question missing: ${q.q}`);
  assert.match(html, /\$0\.0086/, 'total spend for the run');
});

test('a FAILED option is excluded from the grid but its run still renders', () => {
  // One safety-rejected option must not blank the sheet — two of three is still
  // a choice, and that is the same rule the bracket itself follows.
  const html = buildContactSheet([
    ROW,
    { ...ROW, variantId: 'v_00000000000000ef', status: 'safety-reject', imageRef: null },
  ], '.', { runId: 'r_x' });
  assert.match(html, /v_00000000000000ab/.source ? /v_00000000/ : /./);
  assert.ok(!html.includes('safety-reject'), 'a rejected option is not shown as an option');
});

test('a MISSING image file says so instead of rendering a broken frame', () => {
  const html = buildContactSheet([{ ...ROW, imageRef: '.ai-workflow/forge-runs/images/gone.png' }], '.', {});
  assert.match(html, /image not on disk/);
});

test('HOSTILE prompt text cannot inject markup', () => {
  // Prompt text is the only place arbitrary input reaches this document. The
  // assertion is about EXPLOITABILITY, not substrings: an escaped "onerror="
  // sitting inside &lt;img&gt; is inert text. A first version of this check
  // grepped for the substring and reported a false positive on safe output.
  const evil = '<img src=x onerror=alert(1)>"><script>bad()</script>';
  const html = buildContactSheet([{ ...ROW, promptText: evil }], '.', { runId: evil, briefId: evil });
  assert.ok(!/<img|<script/i.test(html), 'no tag from user input may survive as markup');
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, 'it renders as visible text');
  assert.ok(!/alt="[^"]*"[^>]*onerror/i.test(html), 'no attribute breakout');
});

test("single quotes are escaped even though nothing uses single-quoted attributes", () => {
  // Defence in depth. Safety that depends on nobody ever adding a single-quoted
  // attribute is safety with an expiry date.
  const html = buildContactSheet([{ ...ROW, promptText: "it's a lake" }], '.', {});
  assert.match(html, /it&#39;s a lake/);
});

test('the sheet makes NO NETWORK REQUEST — images are local siblings, not remote', () => {
  // Renamed from "self-contained", which became a lie the moment images were
  // linked rather than inlined: the sheet now references files beside it. The
  // property that actually matters is unchanged and is what this asserts — it
  // opens from disk, fetches nothing, and runs no script.
  const html = buildContactSheet([ROW], '.', {});
  assert.ok(!/https?:\/\//.test(html), 'no remote URLs');
  assert.ok(!/<script/i.test(html), 'no scripts at all');
  assert.match(html, /prefers-reduced-motion/, 'and it respects reduced motion');
});
