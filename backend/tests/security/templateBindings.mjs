/**
 * ============================================================================
 * FILE: templateBindings.mjs
 * PURPOSE: Parser-based binding analysis for the email HTML-injection guard.
 * ============================================================================
 *
 * WHY THIS EXISTS (Astra round-1, S3 — the "deferred by name" item)
 * -----------------------------------------------------------------
 * The guard's escape-provenance rule asks: "is this identifier, at this point in the
 * file, still the value that came out of an encoder?" It answered that with regexes:
 * `ANY_ASSIGN_RE`, `COMPOUND_ASSIGN_RE`, `DESTRUCTURE_ASSIGN_RE`, `PARAM_LIST_RE`.
 * Regexes can see a declaration. They cannot see *scope*, and they cannot tell a
 * parameter list from a call argument list — those are lexically the same shape:
 *
 *     function f(email) { ... }      // `email` here is a PARAMETER  -> not escaped
 *     escapeHtml(email)              // `email` here is an ARGUMENT   -> may be escaped
 *
 * The guard's own note records the consequence: `PARAM_LIST_RE` had to be narrowed to
 * lists introduced by `function` or `=>`, and the general shadowing case was recorded
 * as unfixable by regex. THIS MODULE IS THAT FIX. It is built on a real parser, so
 * "which binding does this identifier refer to" is answered structurally.
 *
 * WHAT IT ANSWERS
 * ---------------
 * Given a source text and a set of encoded-expression spans (from the shipped
 * scanner), it reports, for every interpolation, the set of identifiers inside it
 * whose binding is **NOT** an encoder result at that point. That is exactly the
 * question the guard's `escapedIdentifiers()` was approximating.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * - It does not decide the verdict. It returns per-expression facts; the guard decides.
 * - It does not attempt whole-program data flow. A value that is escaped in one
 *   function and passed into another is out of scope, and is reported as `unknown`
 *   rather than silently called safe. An honest "I cannot tell" is worth more here
 *   than a confident guess, because the failure direction that matters is the
 *   FALSE NEGATIVE — a guard that misses an injection is trusted.
 * - It does not parse non-JS. Callers get `{ ok: false, reason }` for anything acorn
 *   rejects, and must treat that as UNKNOWN, never as clean.
 *
 * ACORN IS AN EXPLICIT DEV DEPENDENCY. It was previously transitive (eslint -> espree
 * -> acorn) and undeclared, which meant the analysis would have silently changed
 * behaviour on an eslint bump. Pinned exactly in package.json.
 */
import { parse } from 'acorn';

/** Encoder names whose *result* is a safe string. Kept identical to the guard's list. */
const DEFAULT_ENCODER_NAMES = ['escapeHtml', 'escapeHtmlAttribute', 'escapeHtmlSingleLine', 'esc'];

/**
 * Parse to an ESTree AST, or report why not.
 * @returns {{ok: true, ast: object} | {ok: false, reason: string}}
 */
export function parseModule(code, { sourceType = 'module' } = {}) {
  try {
    const ast = parse(code, {
      ecmaVersion: 'latest',
      sourceType,
      // Locations are needed to map a binding back to the span the scanner reported.
      locations: true,
      ranges: true,
      allowHashBang: true,
    });
    return { ok: true, ast };
  } catch (err) {
    // A syntax error is NOT "no findings". The caller must treat it as UNKNOWN.
    return { ok: false, reason: `${err.name}: ${err.message}` };
  }
}

/**
 * Collect every binding introduced by a *parameter list* anywhere in the file,
 * together with the SPAN OF THE SCOPE THEY GOVERN.
 *
 * This is the thing regex cannot do: a parameter is a distinct binding from a
 * same-named `const` in an enclosing scope, so after
 *
 *     const email = escapeHtml(client.email);
 *     function render(email) { return `<p>${email}</p>`; }
 *
 * the `${email}` inside `render` is the PARAMETER, not the escaped const. Regex saw
 * one name and granted the exemption; this sees two bindings.
 *
 * A binding must govern its whole SCOPE, not merely its own declaring statement.
 * Getting this wrong is subtle and was caught by a paired test: a `let x` inside a
 * block governs the REST of that block, so the governing span is the enclosing
 * block's extent. Scoping a declaration to its own declarator node means the very
 * next statement — including the template being analyzed — falls outside it, and
 * the shadowing goes undetected. That is the false-negative direction.
 *
 * @returns {Array<{name: string, start: number, end: number, kind: string}>}
 */
export function collectParameterBindings(ast) {
  const out = [];

  const addPattern = (pattern, scopeStart, scopeEnd, kind) => {
    if (!pattern) return;
    switch (pattern.type) {
      case 'Identifier':
        out.push({ name: pattern.name, start: scopeStart, end: scopeEnd, kind });
        break;
      case 'AssignmentPattern':
        addPattern(pattern.left, scopeStart, scopeEnd, kind);
        break;
      case 'RestElement':
        addPattern(pattern.argument, scopeStart, scopeEnd, kind);
        break;
      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          if (prop.type === 'RestElement') addPattern(prop.argument, scopeStart, scopeEnd, kind);
          else addPattern(prop.value, scopeStart, scopeEnd, kind);
        }
        break;
      case 'ArrayPattern':
        for (const el of pattern.elements) addPattern(el, scopeStart, scopeEnd, kind);
        break;
      default:
        break;
    }
  };

  /**
   * The span a declaration's name is visible over.
   *
   *  - `var` and function declarations are function-scoped (or module-scoped at top
   *    level), so they govern the nearest enclosing function body / program.
   *  - `let`/`const`/`class` are block-scoped: they govern the remainder of the
   *    nearest enclosing BLOCK, which is the parent BlockStatement (or the
   *    switch/for/function body that forms the block).
   *
   * `parentOf` maps a node to its parent, built once during the walk.
   */
  const blockScopeOf = (node, parentOf, functionScoped) => {
    let cur = parentOf.get(node);
    while (cur) {
      if (functionScoped) {
        if (cur.type === 'FunctionDeclaration' || cur.type === 'FunctionExpression'
          || cur.type === 'ArrowFunctionExpression') {
          return { start: cur.body.start, end: cur.body.end };
        }
        if (cur.type === 'Program') return { start: cur.start, end: cur.end };
      } else {
        if (cur.type === 'BlockStatement' || cur.type === 'SwitchStatement'
          || cur.type === 'StaticBlock') {
          return { start: cur.start, end: cur.end };
        }
        if (cur.type === 'Program') return { start: cur.start, end: cur.end };
        // A `for (let i ...)` head scopes over the loop, which has no BlockStatement
        // parent for the declarator itself.
        if (cur.type === 'ForStatement' || cur.type === 'ForOfStatement'
          || cur.type === 'ForInStatement') {
          return { start: cur.start, end: cur.end };
        }
      }
      cur = parentOf.get(cur);
    }
    return { start: node.start, end: node.end };
  };

  /** Build the parent map once, then walk. */
  const parentOf = new Map();
  const buildParents = (node) => {
    if (!node || typeof node.type !== 'string') return;
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === 'string') { parentOf.set(c, node); buildParents(c); }
        }
      } else if (child && typeof child.type === 'string') {
        parentOf.set(child, node);
        buildParents(child);
      }
    }
  };
  buildParents(ast);

  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;

    const isFunction = [
      'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
    ].includes(node.type);

    if (isFunction && node.body) {
      // A parameter governs the whole FUNCTION, not just the body. Starting the span at
      // `node.body.start` looks right and is wrong: a default-parameter value lives in
      // the parameter list, which sits BEFORE the body, so
      //
      //     const email = escapeHtml(x);
      //     function f(email, h = `<p>${email}</p>`) {}
      //
      // had the `${email}` at an offset outside the `email` param's span — the shadow
      // went unseen and the escaped outer `email` was credited. That is the false
      // negative direction this module exists to close, so the span starts at the
      // parameter list.
      //
      // For an ArrowFunctionExpression with a parenthesised (or bare) param list,
      // `node.start` is the earliest point the binding can be referenced from inside
      // the function. Using it is conservative in the safe direction: it can only make
      // a span larger, which reports more shadowing, never less.
      const bodyEnd = node.body.end;
      const scopeStart = Math.min(
        node.start,
        ...node.params.map((p) => p.start),
      );
      for (const param of node.params) addPattern(param, scopeStart, bodyEnd, 'param');
      // A function expression's own name is bound inside its body only. A
      // FunctionDeclaration's name is handled as a declaration below — it is NOT a
      // parameter, and reporting it as one would be a category error.
      if (node.type === 'FunctionExpression' && node.id) {
        out.push({ name: node.id.name, start: node.body.start, end: bodyEnd, kind: 'fname' });
      }
    }

    // `catch (err) { ... }` binds a name in the handler body.
    if (node.type === 'CatchClause' && node.param && node.body) {
      addPattern(node.param, node.body.start, node.body.end, 'catch');
    }

    // Declarations: scope the name over the correct span for its declaration kind.
    if (node.type === 'VariableDeclaration') {
      const functionScoped = node.kind === 'var';
      const scope = blockScopeOf(node, parentOf, functionScoped);
      for (const d of node.declarations) addPattern(d.id, scope.start, scope.end, 'decl');
    }
    if (node.type === 'ClassDeclaration' && node.id) {
      const scope = blockScopeOf(node, parentOf, false);
      out.push({ name: node.id.name, start: scope.start, end: scope.end, kind: 'class' });
    }
    if (node.type === 'FunctionDeclaration' && node.id) {
      const scope = blockScopeOf(node, parentOf, true);
      out.push({ name: node.id.name, start: scope.start, end: scope.end, kind: 'fdecl' });
    }
    if (node.type === 'ImportDeclaration') {
      for (const spec of node.specifiers) {
        if (spec.local) out.push({ name: spec.local.name, start: ast.start, end: ast.end, kind: 'import' });
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (Array.isArray(child)) for (const c of child) visit(c);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };

  visit(ast);
  return out;
}

/** Walk every node, calling `fn(node, parent)`. Depth-first, structural. */
export function walk(ast, fn) {
  const visit = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    fn(node, parent);
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (Array.isArray(child)) for (const c of child) visit(c, node);
      else if (child && typeof child.type === 'string') visit(child, node);
    }
  };
  visit(ast, null);
}

/**
 * Every identifier that is the *target* of a write anywhere in the file:
 * `x = ...`, `x += ...`, `({x} = ...)`, `[x] = ...`, `for (x of ...)`, `++x`.
 *
 * Kept as a flat set because a write anywhere still disqualifies the narrow claim
 * the guard makes ("escaped here and never reassigned"). Scope-aware tracking of
 * assignment is a larger question and is NOT claimed by this module.
 */
export function collectWriteTargets(ast) {
  const written = new Set();
  const addPattern = (pattern) => {
    if (!pattern) return;
    switch (pattern.type) {
      case 'Identifier': written.add(pattern.name); break;
      case 'ObjectPattern':
        for (const p of pattern.properties) {
          if (p.type === 'RestElement') addPattern(p.argument);
          else addPattern(p.value);
        }
        break;
      case 'ArrayPattern':
        for (const el of pattern.elements) addPattern(el);
        break;
      case 'AssignmentPattern': addPattern(pattern.left); break;
      case 'RestElement': addPattern(pattern.argument); break;
      default: break;
    }
  };

  walk(ast, (node) => {
    if (node.type === 'AssignmentExpression') addPattern(node.left);
    if (node.type === 'UpdateExpression') addPattern(node.argument);
    if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') addPattern(node.left);
  });
  return written;
}

/**
 * Names bound to an encoder CALL: `const x = escapeHtml(...)`, `let y = escapeAttr(...)`.
 *
 * This is provenance, not spelling — the right-hand side must be a call to a name in
 * `encoderNames`, so `const x = 'escapeHtml'` (a string) or `const x = other()` does
 * not qualify.
 */
export function collectEncoderBindings(ast, encoderNames = DEFAULT_ENCODER_NAMES) {
  const bound = new Set();
  const encoders = new Set(encoderNames);
  const calleeName = (callee) => {
    if (!callee) return null;
    if (callee.type === 'Identifier') return callee.name;
    if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier') {
      return callee.property.name;
    }
    return null;
  };

  walk(ast, (node) => {
    if (node.type !== 'VariableDeclarator') return;
    if (!node.init || node.init.type !== 'CallExpression') return;
    const name = calleeName(node.init.callee);
    if (!name || !encoders.has(name)) return;
    if (node.id.type === 'Identifier') bound.add(node.id.name);
  });
  return bound;
}

/**
 * Is the expression occupying `[start, end)` a call to an encoder?
 *
 * `escapeHtml(heading)` inside `${...}` means the *result* is safe regardless of what
 * `heading` is. That is the exemption the guard intends, and it is why a parameter
 * inside an encoder call is not a finding here.
 *
 * The check is structural: the acorn node whose range equals the span, unwrapped of
 * parentheses, must be a CallExpression whose callee names an encoder.
 */
function callWrapping(ast, start, end, encoderNames = DEFAULT_ENCODER_NAMES) {
  const encoders = new Set(encoderNames);
  let found = null;
  walk(ast, (node) => {
    if (found) return;
    if (node.start !== start || node.end !== end) return;
    let expr = node;
    while (expr && expr.type === 'ParenthesizedExpression') expr = expr.expression;
    if (!expr || expr.type !== 'CallExpression') return;
    const callee = expr.callee;
    const name = callee && callee.type === 'Identifier'
      ? callee.name
      : (callee && callee.type === 'MemberExpression' && callee.property ? callee.property.name : null);
    if (name && encoders.has(name)) found = { encoderWrapped: true, callee: name };
  });
  return found;
}

/**
 * The analysis the guard actually wants.
 *
 * For each interpolation span, report the identifiers referenced inside it and which
 * of them are NOT provably safe at that point:
 *
 *   - `paramShadowed` — the name is a parameter (or catch/block binding) governing
 *     this span. A parameter is a different binding from any outer escaped const.
 *   - `written`       — the name is assigned somewhere in the file, so it is not
 *     permanently the encoder's result.
 *   - `notEncoder`    — the name is an identifier reference but was never bound to an
 *     encoder call, so nothing supports calling it safe.
 *
 * `unknown` spans (an interpolation the parser could not locate) are reported as such
 * and are NEVER treated as safe by the caller.
 *
 * @param {string} code
 * @param {Array<{expr: string, start: number, end: number}>} interpolations
 * @param {{encoderNames?: string[]}} [opts]
 * @returns {{ok: false, reason: string} | {ok: true, spans: Array, identifierNames: Set<string>}}
 */
export function analyzeInterpolations(code, interpolations, opts = {}) {
  const parsed = parseModule(code);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  const { ast } = parsed;
  const encoderNames = opts.encoderNames || DEFAULT_ENCODER_NAMES;

  const params = collectParameterBindings(ast);
  const written = collectWriteTargets(ast);
  const encoderBound = collectEncoderBindings(ast, encoderNames);

  const spans = [];
  const identifierNames = new Set();

  for (const interp of interpolations) {
    const start = interp.start;
    const end = interp.end;
    const governing = params.filter((p) => start >= p.start && end <= p.end);

    // Every identifier actually referenced in this span, with its role.
    const referenced = [];
    walk(ast, (node) => {
      if (node.type !== 'Identifier') return;
      if (node.start < start || node.end > end) return;
      referenced.push(node);
    });

    const unsafe = new Set();
    const detail = [];

    /*
     * The encoder CALLEE is not an unsafe value.
     *
     * `escapeHtml(heading)` references two identifiers, but only one is a value being
     * interpolated: `heading`. `escapeHtml` is the function being *called*. Reporting
     * the callee as `notEncoder` is noise that would drown the real findings, so
     * callees are excluded from the identifier role analysis.
     */
    /*
     * Only IDENTIFIER REFERENCES are value identifiers.
     *
     * `c.text` contains two Identifier nodes, but `text` is a PROPERTY NAME, not a
     * reference to a variable. Treating it as one is a false positive that fires
     * whenever the file happens to contain a parameter of the same name — `c.text`
     * was reported as shadowed purely because some unrelated function had a `text`
     * parameter. A member property, an object literal key, and a label are not
     * variable references and must be excluded.
     *
     * The guard's whole risk surface is false positives: a rule that cries wolf on
     * correct code gets the guard deleted, and then it protects nothing.
     */
    const nonReference = new Set();
    walk(ast, (node, parent) => {
      if (!parent) return;
      if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) {
        nonReference.add(node.start);
      }
      if ((parent.type === 'Property' || parent.type === 'MethodDefinition'
        || parent.type === 'PropertyDefinition') && parent.key === node && !parent.computed) {
        /*
         * A SHORTHAND property is a reference, not a key.
         *
         * `{ value }` means `{ value: value }` — the key IS the reference, and acorn
         * gives the key and value nodes the SAME start offset. Excluding it by
         * `parent.key === node` would drop a genuine variable reference and could
         * hide a real finding, which is the direction that matters.
         */
        if (!(parent.type === 'Property' && parent.shorthand)) {
          nonReference.add(node.start);
        }
      }
      if (parent.type === 'ExportSpecifier' || parent.type === 'ImportSpecifier') {
        // `{ a as b }` — the ORIGINAL name is a property reference into the module's
        // exports, not a local binding.
        if (parent.imported === node || parent.exported === node) nonReference.add(node.start);
      }
      if (parent.type === 'LabeledStatement') nonReference.add(node.start);
      if (parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') {
        if (parent.label === node) nonReference.add(node.start);
      }
    });

    const calleePositions = new Set();
    walk(ast, (node) => {
      if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier') {
        calleePositions.add(node.callee.start);
      }
    });

    /*
     * A span fully wrapped in an encoder call is safe by CONSTRUCTION, whatever the
     * binding of its argument. `escapeHtml(heading)` is escaped even though `heading`
     * is a parameter — this is the whole point of an encoder, and it is the shape the
     * guard actually accepts. Reporting it as unsafe would revoke the exemption for
     * every correctly escaped interpolation in the codebase (a false positive, which
     * is what gets a guard switched off).
     */
    const spanCall = callWrapping(ast, start, end, encoderNames);

    for (const node of referenced) {
      const name = node.name;
      identifierNames.add(name);

      // The callee of a call inside this span is a function reference, not a value.
      if (calleePositions.has(node.start)) {
        detail.push({ name, reason: 'callee' });
        continue;
      }

      // A member property / object key / label is not a variable reference.
      if (nonReference.has(node.start)) {
        detail.push({ name, reason: 'propertyName' });
        continue;
      }

      // The span's top-level expression is a call to an encoder -> escaped by
      // construction. Its ARGUMENT bindings do not matter for this span.
      if (spanCall && spanCall.encoderWrapped) {
        detail.push({ name, reason: 'encoderWrapped', by: spanCall.callee });
        continue;
      }

      // The bindings of this name that govern the span, narrowest first.
      const here = governing.filter((p) => p.name === name);

      /*
       * The rule, stated once.
       *
       * Taking the narrowest governing binding avoids the category error of calling
       * an OUTER binding a shadow. `const email = escapeHtml(...)` at module scope
       * governs everything, including the span — that is the binding we WANT, and
       * calling it unsafe would revoke the exemption for every correctly escaped
       * value (a false positive, which is what gets a guard switched off).
       *
       * What is suspect is a scope that BINDS THE NAME FOR ITSELF:
       *   - `param`  — a different binding that merely shares the name;
       *   - `catch`  — same;
       *   - `decl`   — a `let`/`var`/`const`/`class` inside the span's own scope.
       * `import` and `fdecl` are program-level names and are not shadowing.
       */
      const narrowest = here.length
        ? here.reduce((a, b) => (b.end - b.start <= a.end - a.start ? b : a))
        : null;

      /*
       * SHADOWING REQUIRES TWO BINDINGS.
       *
       * A `decl` binding is suspect only when it NARROWS an outer binding of the same
       * name — that is what "shadow" means. When exactly one `decl` governs the span
       * and nothing encloses it (a module-scope `const email = escapeHtml(...)`), that
       * binding is the binding, and the span is safe. Treating it as a shadow would
       * revoke the exemption for every correctly escaped value in the file — a false
       * positive, which is what gets a guard switched off.
       *
       * `param` and `catch` are always suspect: they are a *different* binding from any
       * same-named outer const, whether or not one exists in this particular file.
       */
      const ENCLOSING = here.filter((b) => b !== narrowest);
      let shadowing = false;
      if (narrowest) {
        if (narrowest.kind === 'param' || narrowest.kind === 'catch') shadowing = true;
        else if (narrowest.kind === 'decl' || narrowest.kind === 'class') shadowing = ENCLOSING.length > 0;
      }

      if (shadowing) {
        unsafe.add(name);
        detail.push({ name, reason: 'paramShadowed', by: narrowest.kind });
        continue;
      }
      if (written.has(name)) {
        unsafe.add(name);
        detail.push({ name, reason: 'written' });
        continue;
      }
      if (!encoderBound.has(name)) {
        // Not bound to an encoder: nothing supports treating it as escaped.
        detail.push({ name, reason: 'notEncoder' });
      }
    }

    spans.push({
      expr: interp.expr,
      start,
      end,
      // Only real variable references, so a consumer counting identifiers is not
      // counting property names.
      identifiers: [...new Set(
        referenced
          .filter((n) => !nonReference.has(n.start) && !calleePositions.has(n.start))
          .map((n) => n.name),
      )],
      unsafe: [...unsafe],
      detail,
      status: 'analyzed',
    });
  }

  return { ok: true, spans, identifierNames };
}
