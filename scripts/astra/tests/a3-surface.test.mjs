/**
 * a3-surface.test.mjs — slice A3's server-side tests.
 *
 * AC4.6  every control is labelled DIAL or PROPOSAL, and the registry matches the markup
 * T-I-10 a mutation without the token is a 401
 * T-M-03 a compile record missing `lawChecks` renders as PARTIAL, never "0 checks passed"
 * plus §2.6's required states, the zero-cost claim, and the escaping boundary.
 *
 * THE REGISTRY IS CHECKED IN BOTH DIRECTIONS. "Every registered control appears in the
 * markup" catches a control that was declared and never built. "Every `data-control`
 * in the markup is registered" catches the opposite — a control shipped without a
 * DIAL/PROPOSAL label, which is the exact failure `AC4.6` exists to prevent. A
 * one-directional check passes against either bug.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';

import { readBrainVersion } from '../core/brain.mjs';
import { startServer } from '../surface/server.mjs';
import { CONTROLS, CONTROL_KINDS, READ_ONLY_PANES, verifyControls } from '../surface/controls.mjs';
import { renderThink, renderCompose } from '../surface/panes.mjs';
import { stateDenied, stateEmpty, statePartial, stateFailure, stateLoading } from '../surface/shell.mjs';

const TOKEN = 'a3-test-token';
const BRIEF = { text: 'a frozen lake at dawn, low vantage, the ice breathing', intent: 'hero', aspect: '16:9' };

async function withServer(fn) {
  const s = await startServer({ port: 0, token: TOKEN });
  const base = s.url.replace(/\/$/, '');
  const req = async (path, opts = {}) => {
    const r = await fetch(base + path, opts);
    return { status: r.status, text: await r.text(), headers: r.headers };
  };
  const post = (route, body, token) => req(`/api/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-astra-token': token } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  try {
    return await fn({ base, req, post });
  } finally {
    await s.close();
  }
}

const idsIn = (html) => [...html.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);

// ---------------------------------------------------------------------------
// AC4.6 — the control inventory
// ---------------------------------------------------------------------------

test('T-P-01 (AC4.6) every control carries DIAL or PROPOSAL, and the registry is consistent', () => {
  const check = verifyControls();
  assert.equal(check.ok, true, `registry inconsistent: ${JSON.stringify(check)}`);
  assert.deepEqual(check.badKind, [], 'a control with no kind is a control whose blast radius nobody stated');
  assert.deepEqual(check.duplicates, []);
  assert.deepEqual(check.missingFields, []);
  assert.deepEqual(check.writeWithoutToken, [], 'a write with no token is a write with no CSRF protection');
  assert.deepEqual(check.proposalThatWrites, [], 'a proposal that writes is not a proposal');
  assert.ok(check.dials >= 8, `expected a real dial surface, found ${check.dials}`);
  assert.ok(check.proposals >= 1, 'the proposal channel must be represented');
  for (const c of CONTROLS) assert.ok(CONTROL_KINDS.includes(c.kind), `${c.id} has kind ${c.kind}`);
});

test('T-P-01 (AC4.6) the rendered markup and the registry agree in BOTH directions', async () => {
  await withServer(async ({ req, post }) => {
    await post('directions', BRIEF);
    const compiled = await post('compile', { brief: BRIEF }, TOKEN);
    const home = await req('/');
    const think = await req(`/think/${compiled.json?.compileId ?? JSON.parse(compiled.text).compileId}`);

    const inMarkup = new Set([...idsIn(home.text), ...idsIn(think.text)]);
    const declared = new Set(CONTROLS.filter((c) => c.rendered).map((c) => c.id));

    const declaredButNotRendered = [...declared].filter((id) => !inMarkup.has(id));
    const renderedButNotDeclared = [...inMarkup].filter((id) => !declared.has(id));

    assert.deepEqual(declaredButNotRendered, [],
      'these controls are declared as rendered but never appear in the markup');
    assert.deepEqual(renderedButNotDeclared, [],
      'these controls appear in the markup but carry no registry entry — they have no DIAL/PROPOSAL label');
    assert.ok(inMarkup.size >= 14, `expected the full surface, found ${inMarkup.size} controls`);
  });
});

test('T-P-01 (AC4.6) the read-only panes are read-only BY DESIGN, with a stated reason', () => {
  assert.deepEqual(READ_ONLY_PANES.map((p) => p.pane).sort(), ['law', 'state']);
  for (const p of READ_ONLY_PANES) assert.ok(p.reason.length > 40, `${p.pane} needs a real reason`);
  // And no control is registered against them — a "read-only" pane with a control
  // would be the most expensive feature in the product.
  for (const p of READ_ONLY_PANES) {
    assert.deepEqual(CONTROLS.filter((c) => c.pane === p.pane), [], `${p.pane} must have no controls`);
  }
});

// ---------------------------------------------------------------------------
// T-I-10 — the mutation token
// ---------------------------------------------------------------------------

test('T-I-10 a mutation without the token is 401 and changes nothing', async () => {
  await withServer(async ({ post }) => {
    for (const route of ['compile', 'reject', 'preview', 'tuning-commit']) {
      const r = await post(route, {});
      assert.equal(r.status, 401, `${route} without a token must be 401`);
      assert.equal(JSON.parse(r.text).error.code, 'E_TOKEN_REQUIRED');
    }
    const wrong = await post('compile', {}, 'not-the-token');
    assert.equal(wrong.status, 401);
    assert.equal(JSON.parse(wrong.text).error.code, 'E_TOKEN_INVALID');

    // A read must NOT need the token — otherwise the 401 proves nothing about writes.
    const read = await post('directions', BRIEF);
    assert.equal(read.status, 200, 'directions is a read and must not require a token');
  });
});

test('T-I-10 the token gate runs BEFORE the handler, so a 501 is unreachable without it', async () => {
  await withServer(async ({ post }) => {
    const noToken = await post('tuning-commit', {});
    assert.equal(noToken.status, 401, 'an unbuilt slice must still be behind the token gate');
    const withToken = await post('tuning-commit', {}, TOKEN);
    assert.equal(withToken.status, 501);
    assert.equal(JSON.parse(withToken.text).error.code, 'E_NOT_BUILT');
  });
});

test('T-I-10 the token cookie is SameSite=Strict', async () => {
  await withServer(async ({ req }) => {
    const r = await req('/');
    const cookie = r.headers.get('set-cookie') ?? '';
    assert.match(cookie, /astra_token=/);
    assert.match(cookie, /SameSite=Strict/, 'the CSRF defence is the cookie attribute, not obscurity');
  });
});

// ---------------------------------------------------------------------------
// T-M-03 — a partial record is never rendered as a pass
// ---------------------------------------------------------------------------

test('T-M-03 a compile missing lawChecks renders PARTIAL, never "0 checks passed"', () => {
  const html = renderThink({
    view: {
      partial: true, partialReason: 'lawChecks failed to load', blocked: false,
      brainVersion: 'x', slots: [], lawChecks: [], capabilities: {}, promptText: '',
    },
    compileId: 'cmp-test-1',
  });
  assert.match(html, /state-partial/, 'a partial view must carry the banner');
  assert.match(html, /lawChecks failed to load/, 'the banner must carry the reason');
  assert.doesNotMatch(html, /0 passed/,
    'zero passes and five unobserved checks are different findings and must not render the same');
});

test('T-M-03 a blocked compile names the error code and the offending slot', () => {
  const html = renderThink({
    view: {
      partial: true, partialReason: 'blocked', blocked: true, brainVersion: 'x', slots: [],
      lawChecks: [
        { law: 'kill-list', passed: true, detail: null, slot: null },
        { law: 'LAW4-optics', passed: false, detail: 'literal creature', slot: 'optics' },
        { law: 'banned-facets', passed: null, detail: null, slot: null },
      ],
      capabilities: {}, promptText: '',
    },
    compileId: 'cmp-test-2',
  });
  assert.match(html, /E_LAW_VIOLATION/, 'the error code must appear verbatim');
  assert.match(html, /optics/, 'the offending slot must be named');
  assert.match(html, /NOT OBSERVED/, 'an unrun check is NOT OBSERVED, never a pass');
  // The override affordance must NOT exist on the Law side — that is the whole risk.
  assert.doesNotMatch(html, /ignore/i, 'no override affordance may render next to a failed check');
});

// ---------------------------------------------------------------------------
// §2.6 — the required states
// ---------------------------------------------------------------------------

test('§2.6 every required state names its reason, and none says "No data"', () => {
  assert.match(stateEmpty({ what: 'No compiles', reason: 'start in Compose' }), /start in Compose/);
  assert.match(statePartial({ shown: 3, total: 5, reason: 'the rest failed to load' }), /3 of 5 shown/);
  assert.match(stateDenied({ message: 'this is a write; the console needs the mutation token' }),
    /needs the mutation token/);
  assert.match(stateFailure({ code: 'E_LAW_VIOLATION', detail: 'd', slot: 'optics' }), /E_LAW_VIOLATION/);
  assert.match(stateLoading('directions'), /Loading directions/);
  for (const html of [
    stateEmpty({ what: 'a', reason: 'b' }), statePartial({ shown: 1, total: 2, reason: 'c' }),
    stateDenied({ message: 'd' }), stateFailure({ code: 'E_X' }), stateLoading('e'),
  ]) {
    assert.doesNotMatch(html, /No data/i);
    assert.doesNotMatch(html, /Something went wrong/i);
  }
});

test('§2.6 the empty directions state offers the action that fixes it', () => {
  const html = renderCompose({ brief: BRIEF, directions: null, slots: [] });
  assert.match(html, /Gate 0 has not been asked/);
  assert.match(html, /data-control="directions\.request"/);
});

test('§2.6 an empty slot renders its REASON, never a bare dash', () => {
  const html = renderCompose({
    brief: BRIEF, directions: null,
    slots: [{ key: 'subject', value: '', empty: true, emptyReason: 'deliberately empty — pure phenomenon' }],
  });
  assert.match(html, /deliberately empty — pure phenomenon/);
  assert.doesNotMatch(html, /<td[^>]*>\s*—\s*<\/td>/, 'a dash reads as a bug; the reason reads as a decision');
});

// ---------------------------------------------------------------------------
// The zero-cost claim, the version, and the escaping boundary
// ---------------------------------------------------------------------------

test('AC2.1 /api/directions is free and makes no provider call', async () => {
  await withServer(async ({ post }) => {
    const r = await post('directions', BRIEF);
    const j = JSON.parse(r.text);
    assert.equal(r.status, 200);
    assert.equal(j.directions.length, 3);
    assert.equal(j.spent, 0, 'Gate 0 must report zero spend');
    assert.equal(j.generated, 0, 'Gate 0 must report nothing generated');
    assert.equal(j.brainVersion, readBrainVersion(), 'the version must be read from code');
    for (const d of j.directions) {
      assert.ok(d.tierReason && d.tierReason.length > 0, 'tierReason is ALWAYS present');
      assert.ok(['evidence', 'prior'].includes(d.tier));
      assert.ok(Array.isArray(d.swatches) && d.swatches.length > 0);
      // Cold start: no evidence is injected, so nothing may claim `evidence`.
      assert.equal(d.tier, 'prior', 'with no injected picks every direction is prior');
    }
  });
});

test('the rendered brainVersion comes from code, not a literal', async () => {
  await withServer(async ({ req }) => {
    const r = await req('/');
    const shown = /data-brain-version>([^<]+)</.exec(r.text)?.[1];
    assert.equal(shown, readBrainVersion());
  });
});

test('the brief is escaped — a loopback origin still runs script', async () => {
  await withServer(async ({ req, post }) => {
    const payload = '<script>window.__astra_xss=1</script>';
    await post('directions', { text: payload });
    const r = await req('/');
    assert.doesNotMatch(r.text, /<script>window\.__astra_xss/, 'the payload must not render as markup');
    assert.match(r.text, /&lt;script&gt;window\.__astra_xss/, 'and it must render, escaped');
  });
});

test('static traversal is refused', async () => {
  const s = await startServer({ port: 0, token: TOKEN });
  try {
    // A raw socket, because `fetch` normalises `..` out of the path before sending —
    // a traversal test that used fetch would test the URL parser, not the server.
    const raw = await new Promise((res) => {
      const sock = connect(s.port, '127.0.0.1', () => {
        sock.write('GET /static/../../../package.json HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
      });
      let out = '';
      sock.on('data', (d) => { out += d; });
      sock.on('close', () => res(out));
      sock.on('error', () => res('ERROR'));
    });
    const status = Number(/HTTP\/1\.1 (\d{3})/.exec(raw)?.[1]);
    assert.ok([403, 404].includes(status), `traversal must not be served, got status ${status}`);
    assert.doesNotMatch(raw, /"name":\s*"-SS-PT-New"/, 'the repo package.json must not be readable');
  } finally {
    await s.close();
  }
});
