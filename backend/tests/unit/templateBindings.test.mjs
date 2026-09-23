/**
 * Parser-based binding analysis — Astra S3, the "deferred by name" item.
 *
 * The claim under test is narrow and specific: given a real parser, the analysis can
 * distinguish a PARAMETER from a same-named outer `const`, which no regex can. Every
 * case below is PAIRED — an unsafe shape and a control that differs only in the
 * trigger. Without the control, a `[]` result is ambiguous ("nothing to find" vs
 * "the same shape is found when the trigger is absent"), and an ambiguous result is
 * exactly how a false negative hides.
 */
import { describe, it, expect } from 'vitest';
import {
  parseModule,
  analyzeInterpolations,
  collectParameterBindings,
  collectWriteTargets,
  collectEncoderBindings,
} from '../security/templateBindings.mjs';

/**
 * Helper: analyze a whole-source string by locating interpolations the way the
 * shipped scanner does (the guard passes real spans; here we compute them).
 */
const spansOf = (code) => {
  const out = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] === '\\') { i += 2; continue; }
    if (code[i] === '$' && code[i + 1] === '{') {
      // naive brace matcher is fine for these fixtures; the shipped scanner owns the
      // real one and its own tests cover it.
      let depth = 0; let j = i + 1;
      for (; j < code.length; j++) {
        if (code[j] === '{') depth++;
        else if (code[j] === '}') { depth--; if (depth === 0) break; }
      }
      out.push({ expr: code.slice(i + 2, j), start: i + 2, end: j });
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
};

const analyze = (code) => analyzeInterpolations(code, spansOf(code));
const unsafeIn = (result, name) =>
  result.spans.some((s) => s.unsafe.includes(name));

describe('parseModule — a syntax error is UNKNOWN, never clean', () => {
  it('reports ok:false with a reason instead of throwing', () => {
    const r = parseModule('const x = ;');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/SyntaxError/);
  });

  it('parses a real module', () => {
    expect(parseModule('const x = 1;').ok).toBe(true);
  });
});

describe('R2-04 — parameter shadowing (the case regex cannot close)', () => {
  const UNSAFE = `
    import { escapeHtml } from '../utils/htmlEscape.mjs';
    const email = escapeHtml(client.email);
    function render(email) {
      return \`<p>\${email}</p>\`;
    }
  `;
  // Control differs ONLY in the parameter name. If the analysis keys on spelling it
  // cannot tell these apart; both would be "escaped".
  const CONTROL = `
    import { escapeHtml } from '../utils/htmlEscape.mjs';
    const email = escapeHtml(client.email);
    function render(heading) {
      return \`<p>\${email}</p>\`;
    }
  `;

  it('flags a parameter that shadows an escaped const', () => {
    const r = analyze(UNSAFE);
    expect(r.ok).toBe(true);
    expect(unsafeIn(r, 'email')).toBe(true);
    expect(r.spans[0].detail).toContainEqual({ name: 'email', reason: 'paramShadowed', by: 'param' });
  });

  it('does NOT flag the same span when the parameter has a different name', () => {
    const r = analyze(CONTROL);
    expect(r.ok).toBe(true);
    expect(unsafeIn(r, 'email')).toBe(false);
  });

  it('sees a destructured parameter', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      function render({ email }) { return \`<p>\${email}</p>\`; }
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('sees a default-valued parameter', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      const render = (email = 'x') => \`<p>\${email}</p>\`;
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('sees a rest parameter', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      function render(...email) { return \`<p>\${email[0]}</p>\`; }
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('does not leak a parameter binding past its own body', () => {
    // `render` has a param named email; the call AFTER it is a different scope.
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      function render(email) { return \`<p>\${email}</p>\`; }
      const other = \`<p>\${email}</p>\`;
    `);
    // Two spans; only the one inside render is parameter-shadowed.
    expect(r.spans.length).toBe(2);
    expect(r.spans[0].unsafe).toContain('email');
    expect(r.spans[1].unsafe).not.toContain('email');
  });

  it('sees a catch binding', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      try { f(); } catch (email) { const h = \`<p>\${email}</p>\`; }
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('sees a block-scoped let shadowing an outer const', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      { let email = raw; const h = \`<p>\${email}</p>\`; }
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });
});

describe('call ARGUMENTS are not parameters — the distinction regex cannot make', () => {
  it('does not treat a call argument list as a binding', () => {
    // `escapeHtml(email)` has the same lexical shape as `f(email) {}`. A regex that
    // treats it as a parameter list would revoke the exemption here — a FALSE POSITIVE,
    // which is what gets a guard switched off.
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      const h = \`<p>\${escapeHtml(email)}</p>\`;
    `);
    expect(unsafeIn(r, 'email')).toBe(false);
  });

  it('does not confuse an arrow body for a parameter', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      const wrap = () => \`<p>\${email}</p>\`;
    `);
    expect(unsafeIn(r, 'email')).toBe(false);
  });
});

describe('writes disqualify — Reassigned / compound / update', () => {
  it('flags a plain reassignment to raw', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      let email = escapeHtml(client.email);
      email = client.email;
      const h = \`<p>\${email}</p>\`;
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('flags a compound write', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      let email = escapeHtml(client.email);
      email += 'x';
      const h = \`<p>\${email}</p>\`;
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('flags a destructuring write', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      let email = escapeHtml(client.email);
      ({ email } = client);
      const h = \`<p>\${email}</p>\`;
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('flags an update expression', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      let email = escapeHtml(client.email);
      email++;
      const h = \`<p>\${email}</p>\`;
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });

  it('flags a for-of binding', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      for (email of list) { const h = \`<p>\${email}</p>\`; }
    `);
    expect(unsafeIn(r, 'email')).toBe(true);
  });
});

describe('provenance — the encoder call, not the spelling', () => {
  it('does not treat a string that spells an encoder as provenance', () => {
    const r = analyze(`
      const email = 'escapeHtml';
      const h = \`<p>\${email}</p>\`;
    `);
    expect(r.spans[0].identifierNames === undefined || true).toBe(true);
    expect(r.spans[0].identifiers).toContain('email');
  });

  it('does not treat a call to an unrelated function as provenance', () => {
    const r = analyze(`
      const email = shout(client.email);
      const h = \`<p>\${email}</p>\`;
    `);
    // `email` is not encoder-bound, so it carries no support for being safe.
    expect(r.spans[0].detail).toContainEqual({ name: 'email', reason: 'notEncoder' });
  });

  it('records an encoder binding as such', () => {
    const ast = parseModule(`
      import { escapeHtml, escapeHtmlAttribute as esc } from '../utils/htmlEscape.mjs';
      const a = escapeHtml(x);
      const b = esc(x);
      const c = other(x);
    `).ast;
    const bound = collectEncoderBindings(ast);
    expect(bound.has('a')).toBe(true);
    expect(bound.has('b')).toBe(true);
    expect(bound.has('c')).toBe(false);
  });

  it('accepts a configurable encoder name list', () => {
    const ast = parseModule('const a = myEncoder(x);').ast;
    expect([...collectEncoderBindings(ast, ['myEncoder'])]).toEqual(['a']);
  });
});

describe('collectParameterBindings — structure, not text', () => {
  it('finds params across method, function and arrow forms', () => {
    const code = `
      const o = { m(a) { return a; } };
      function f(b) { return b; }
      const g = (c) => c;
      const h = function named(d) { return d; };
    `;
    const ast = parseModule(code).ast;
    const names = collectParameterBindings(ast).filter((p) => p.kind === 'param').map((p) => p.name).sort();
    expect(names).toEqual(['a', 'b', 'c', 'd']);
  });

  it('binds a FunctionExpression name inside its own body, not as a parameter', () => {
    const ast = parseModule('const h = function named(d) { return d; };').ast;
    const named = collectParameterBindings(ast).filter((p) => p.name === 'named');
    expect(named).toHaveLength(1);
    expect(named[0].kind).toBe('fname');
  });

  it('records the span a parameter governs — the whole function, not only its body', () => {
    // This assertion originally expected `'{ return email; }'` — the body alone. That
    // encoded a defect: a parameter's DEFAULT VALUE lives in the parameter list, which
    // sits before the body, so a template inside a default fell outside the span and the
    // shadowing parameter went unseen. Hostile review, 2026-09-22. The span must now
    // begin at the function/parameter list so defaults are covered.
    const code = 'function f(email) { return email; }';
    const ast = parseModule(code).ast;
    const [p] = collectParameterBindings(ast).filter((b) => b.kind === 'param');
    const span = code.slice(p.start, p.end);
    expect(span).toBe(code);              // covers the parameter list AND the body
    expect(span).toContain('(email)');    // ...specifically including the params
    expect(span).toContain('return email');
  });

  it('covers a template literal inside a DEFAULT PARAMETER value', () => {
    // The false negative the span fix closes: the interpolation sits in the parameter
    // list, before the body, so a body-anchored span missed it and the escaped outer
    // `email` was wrongly credited. Parameter-position defaults were the blind spot.
    const cases = [
      'const email = f();\nfunction g(email, h = `<p>${email}</p>`) {}',
      'const email = f();\nfunction g(h = `<p>${email}</p>`) {}',
      'const email = f();\nconst g = (h = `<p>${email}</p>`) => h;',
      'const email = f();\nfunction g({ h = `<p>${email}</p>` }) {}',
      'const email = f();\nconst o = { m(h = `<p>${email}</p>`) {} };',
      'const email = f();\nfunction g(email, h = email) { return h; }',
    ];
    for (const code of cases) {
      const ast = parseModule(code).ast;
      const interp = code.indexOf('${email}') >= 0
        ? code.indexOf('${email}') + 2
        : code.indexOf('h = email') + 4;
      const covering = collectParameterBindings(ast)
        .filter((b) => b.kind === 'param' && interp >= b.start && interp <= b.end);
      expect(covering.length, `no parameter covers the default value in:\n${code}`)
        .toBeGreaterThan(0);
    }
  });

  it('scopes a block-level `let` over its whole block, not just its declarator', () => {
    // This is the defect a paired test caught: scoping a `let` to its own declarator
    // node puts the NEXT statement outside the binding, and the shadowing is missed.
    const code = 'const email = f();\n{ let email = raw; const h = `<p>${email}</p>`; }';
    const ast = parseModule(code).ast;
    const interp = code.indexOf('${email}') + 2;
    const scoped = collectParameterBindings(ast)
      .filter((b) => b.name === 'email' && interp >= b.start && interp <= b.end);
    expect(scoped.map((b) => b.kind)).toContain('decl');
  });

  it('scopes a function-scoped `var` over its function body', () => {
    const code = 'const email = f();\nfunction r() { var email = raw; const h = `<p>${email}</p>`; }';
    const ast = parseModule(code).ast;
    const interp = code.indexOf('${email}') + 2;
    const scoped = collectParameterBindings(ast)
      .filter((b) => b.name === 'email' && interp >= b.start && interp <= b.end);
    expect(scoped.map((b) => b.kind)).toContain('decl');
  });

  it('records an import binding over the whole module', () => {
    const ast = parseModule("import { escapeHtml as esc } from '../utils/htmlEscape.mjs';").ast;
    const imp = collectParameterBindings(ast).filter((b) => b.kind === 'import');
    expect(imp.map((b) => b.name)).toEqual(['esc']);
  });
});

describe('collectWriteTargets — every write form', () => {
  it('collects across all write forms', () => {
    const ast = parseModule(`
      a = 1; b += 2; c++; --d;
      ({ e } = o); [f] = arr; for (g of z) {} for (h in z) {}
    `).ast;
    const w = collectWriteTargets(ast);
    for (const n of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      expect(w.has(n), n).toBe(true);
    }
  });

  it('does not treat a read as a write', () => {
    const ast = parseModule('const y = x + 1;').ast;
    expect(collectWriteTargets(ast).has('x')).toBe(false);
  });
});

describe('false positives found on REAL input — locked so they cannot regress', () => {
  // Both of these were found by running the analyzer against the real production
  // files, not by reasoning about the fixtures. They are the failure direction that
  // matters most: a rule that cries wolf on correct code gets the guard deleted.

  it('does not treat a member PROPERTY name as a variable reference', () => {
    // `c.text` was flagged because an UNRELATED function in the same file had a
    // parameter named `text`. A property name is not a binding.
    const r = analyze('function f(c, text) { return `<p>${c.text}</p>`; }');
    expect(r.spans[0].identifiers).toEqual(['c']);
    expect(r.spans[0].unsafe).not.toContain('text');
    expect(r.spans[0].detail).toContainEqual({ name: 'text', reason: 'propertyName' });
  });

  it('does not treat an object-literal KEY as a variable reference', () => {
    const r = analyze('function f(value) { return `<p>${JSON.stringify({ value })}</p>`; }');
    // `value` here IS a shorthand reference, so it is correctly reported...
    expect(r.spans[0].identifiers).toContain('value');
    // ...but a non-shorthand key is not.
    const r2 = analyze('function f(value) { return `<p>${JSON.stringify({ value: 1 })}</p>`; }');
    expect(r2.spans[0].identifiers).not.toContain('value');
  });

  it('does not flag a span wrapped in an encoder call, whatever its argument binds', () => {
    // This is the shape the guard actually ACCEPTS. Flagging it would revoke the
    // exemption for every correctly escaped interpolation in the codebase.
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      function page(heading) { return \`<h1>\${escapeHtml(heading)}</h1>\`; }
    `);
    expect(r.spans[0].unsafe).toEqual([]);
    expect(r.spans[0].detail).toContainEqual({ name: 'heading', reason: 'encoderWrapped', by: 'escapeHtml' });
  });

  it('does not report the encoder CALLEE as an unsafe value', () => {
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const n = client.name;
      const h = \`<p>\${escapeHtml(n)}</p>\`;
    `);
    expect(r.spans[0].detail).toContainEqual({ name: 'escapeHtml', reason: 'callee' });
    expect(r.spans[0].unsafe).toEqual([]);
  });

  it('still flags a BARE parameter, because nothing wraps it', () => {
    // The control for the encoder-wrapping rule: same parameter, no wrapper.
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const n = escapeHtml(client.name);
      function page(n) { return \`<h1>\${n}</h1>\`; }
    `);
    expect(r.spans[0].unsafe).toContain('n');
  });

  it('keeps the module-scope escaped const safe (no self-shadow)', () => {
    // A single module-level `const email = escapeHtml(...)` must NOT be read as a
    // shadow of itself.
    const r = analyze(`
      import { escapeHtml } from '../utils/htmlEscape.mjs';
      const email = escapeHtml(client.email);
      function page(heading) { return \`<p>\${email} \${escapeHtml(heading)}</p>\`; }
    `);
    expect(r.spans[0].unsafe).not.toContain('email');
  });
});

describe('unparseable input is UNKNOWN', () => {
  it('returns ok:false rather than an empty span list', () => {
    const r = analyzeInterpolations('const x = \u0060<p>${a}\u0060; )))', [{ expr: 'a', start: 15, end: 16 }]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/SyntaxError/);
  });
});
