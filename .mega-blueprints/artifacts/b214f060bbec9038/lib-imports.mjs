/**
 * FILE: lib-imports.mjs
 * WHY:  Two packet tools answer "does this module really import that file?" — `boot-gate.mjs` (mount
 *       graph) and `drift-audit.mjs` (pre-push rule-42 audit). Both got it wrong repeatedly while the
 *       extraction was hand-rolled:
 *         - a filename SUBSTRING was satisfied by a comment (round 113 F12);
 *         - a filename REGEX was satisfied by an import inside a block comment, inside a template
 *           literal, or from a different file sharing the basename (round 114 F1);
 *         - masking by hand then produced a catalogue of its own holes (round 116): `${` nesting was
 *           not tracked, so a nested template un-masked its inner text; a `\`+newline continuation
 *           desynchronised masked lines from original lines and silently skipped every later import;
 *           a regex literal containing `/*` opened a phantom comment; only one statement per line was
 *           seen; a commented-out `export` counted as a real export.
 *       Each of those was a FALSE PASS in a tool whose entire job is catching Render-crashing imports.
 *       So the hand-rolled masker is GONE. This module uses **acorn** — already a dependency in this
 *       repo (`backend/node_modules/acorn`, 8.x) — to parse the file and read the AST. A real parser
 *       has no opinion about backticks or regex literals; it follows the grammar.
 *
 *       A file that does not parse is reported as `parseError`, never silently as "no imports": an
 *       unparseable module is itself a boot risk, and silence here is the failure mode this whole
 *       module exists to prevent.
 * NOTE: pure functions plus existence checks. Import-safe (no side effects).
 */
import { existsSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Resolve acorn from the CHECKOUT first, derived from this module's own location
// (`<checkout>/.mega-blueprints/artifacts/<id>/lib-imports.mjs`), then from the caller's cwd, then by
// bare specifier. The first version used cwd only, so every probe run from a temp directory threw
// "acorn is not resolvable" — a tool that only works from one directory is a tool that reports the
// wrong thing the moment someone runs it differently.
const here = path.dirname(fileURLToPath(import.meta.url));
const checkoutRoot = path.resolve(here, '..', '..', '..');
let acorn = null;
for (const candidate of [
  path.join(checkoutRoot, 'backend', 'node_modules', 'acorn'),
  path.join(process.cwd(), 'node_modules', 'acorn'),
  'acorn',
]) {
  try {
    acorn = require(candidate);
    if (acorn?.parse) break;
    acorn = null;
  } catch {
    acorn = null;
  }
}
// FAIL LOUDLY. A silent fall back to text matching would restore exactly the false passes that four
// review findings were built on.
if (!acorn?.parse) {
  throw new Error('lib-imports: acorn is not resolvable — refusing to fall back to text matching');
}

/** Parse a module, returning { ast } or { parseError }. */
export function parseModule(source) {
  try {
    const ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowHashBang: true,
      locations: true,
    });
    return { ast };
  } catch (error) {
    return { parseError: `${error.message} (line ${error.loc?.line ?? '?'})` };
  }
}

/**
 * Import/export-from statements found by the PARSER.
 * Returns an array of { clause, specifier, line } — the same shape the earlier text scanner returned,
 * so both callers keep working — with `parseError` attached when the file could not be parsed.
 */
export function collectImportStatements(source) {
  const { ast, parseError } = parseModule(source);
  const statements = [];
  if (parseError) {
    statements.parseError = parseError;
    return statements;
  }
  for (const node of ast.body) {
    const line = node.loc?.start?.line ?? 0;
    if (node.type === 'ImportDeclaration') {
      statements.push({ clause: clauseFor(node.specifiers), specifier: node.source.value, line });
    } else if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration')
      && node.source) {
      statements.push({ clause: clauseFor(node.specifiers ?? []), specifier: node.source.value, line });
    }
  }
  return statements;
}

function clauseFor(specifiers) {
  const parts = specifiers.map((spec) => {
    if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ExportDefaultSpecifier') return 'default';
    if (spec.type === 'ImportNamespaceSpecifier') return '*';
    return spec.imported?.name ?? spec.local?.name ?? '?';
  });
  return `import { ${parts.join(', ')} }`;
}

/** The names a caller may import from this file, read from the AST. */
export function exportSurface(file, depth = 0, seen = new Set()) {
  const source = readFileSync(file, 'utf8');
  const isCommonJs = /\.cjs$/.test(file);
  if (isCommonJs) return { names: new Set(), wildcard: false, commonJs: true, parseError: null };

  const { ast, parseError } = parseModule(source);
  if (parseError) return { names: new Set(), wildcard: true, commonJs: false, parseError };

  const names = new Set();
  let wildcard = false;
  for (const node of ast.body) {
    switch (node.type) {
      case 'ExportDefaultDeclaration':
        names.add('default');
        break;
      case 'ExportNamedDeclaration':
        for (const spec of node.specifiers ?? []) {
          const exported = spec.exported?.name ?? spec.exported?.value;
          if (exported) names.add(exported);
        }
        if (node.declaration) {
          for (const name of declaredNames(node.declaration)) names.add(name);
        }
        if (node.source) {
          // `export { a } from './x.mjs'` — the names come from the specifiers above; the target's
          // own surface is not transitive here, which matches ESM semantics.
        }
        break;
      case 'ExportAllDeclaration':
        if (node.exported?.name) names.add(node.exported.name); // `export * as ns from '…'`
        else wildcard = true;
        break;
      default:
        break;
    }
  }

  // Follow LOCAL `export *` (round 115): without this, 31 real imports were reported unverifiable,
  // which is exactly where a missing export could hide.
  if (depth < 4 && !seen.has(file)) {
    seen.add(file);
    for (const node of ast.body) {
      if (node.type !== 'ExportAllDeclaration' || node.exported || !node.source) continue;
      const resolved = resolveSpecifier(file, node.source.value);
      if (resolved.file) {
        const nested = exportSurface(resolved.file, depth + 1, seen);
        for (const name of nested.names) names.add(name);
        if (nested.wildcard) wildcard = true;
      } else if (resolved.external) {
        wildcard = true; // a package re-export: not ours to resolve statically
      }
    }
  }
  return { names, wildcard, commonJs: false, parseError: null };
}

/** Every name a declaration statement binds — including the SECOND name of `const a = 1, b = 2;`. */
function declaredNames(declaration) {
  if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
    return declaration.id ? [declaration.id.name] : [];
  }
  if (declaration.type === 'VariableDeclaration') {
    const out = [];
    for (const declarator of declaration.declarations) {
      collectPatternNames(declarator.id, out);
    }
    return out;
  }
  return [];
}

function collectPatternNames(pattern, out) {
  if (!pattern) return;
  switch (pattern.type) {
    case 'Identifier': out.push(pattern.name); break;
    case 'ObjectPattern':
      for (const prop of pattern.properties) {
        collectPatternNames(prop.value ?? prop.argument ?? prop.key, out);
      }
      break;
    case 'ArrayPattern':
      for (const element of pattern.elements) collectPatternNames(element, out);
      break;
    case 'AssignmentPattern': collectPatternNames(pattern.left, out); break;
    case 'RestElement': collectPatternNames(pattern.argument, out); break;
    default: break;
  }
}

/**
 * Resolve a relative specifier from a file to a real file on disk, or report why not.
 *
 * NODE ESM SEMANTICS, deliberately — and this function has now been wrong in TWO ways, both found by
 * comparing it with Node rather than with my own reasoning:
 *
 *  1. DIRECTORY → index.mjs. Node refuses directory imports (ERR_UNSUPPORTED_DIR_IMPORT), so resolving
 *     one would have reported OK for a module the server cannot load. Directories come back as
 *     `{ directory }` (round 121).
 *  2. EXTENSION GUESSING. This resolver used to try `<base>.mjs`, `<base>.cjs`, `<base>.js`, so
 *     `import './legacy'` resolved to `legacy.mjs` and the audit said OK while Node threw
 *     ERR_MODULE_NOT_FOUND — a false pass in the rule-42 boot gate, demonstrated with a fixture
 *     (round 122). Node ESM requires an explicit extension; there is no guessing to imitate.
 *
 * So ONLY an exact existing path resolves. A query string (`./x.mjs?raw`) is left unresolved too —
 * that form is a BUNDLER feature and Node cannot load it either.
 *
 * KNOWN LIMITATION, stated rather than implied: a filename containing a literal `%` (e.g. `a%20b.mjs`)
 * resolves here but Node percent-DECODES the specifier and would look for `a b.mjs`. Requiring a `%`
 * in a filename makes it unrealistic, and implementing percent-decoding would break legitimate names
 * containing spaces, so it is recorded instead of guessed at.
 */
export function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith('.')) return { external: true };
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (existsSync(base)) {
    if (statSync(base).isFile()) return { file: base };
    if (statSync(base).isDirectory()) return { directory: base };
  }
  return { missing: base };
}

/** True when `fromFile` has a real statement importing exactly `targetFile` (path-resolved). */
export function importsFile(fromFile, targetFile, source) {
  const target = path.resolve(targetFile);
  for (const { specifier } of collectImportStatements(source ?? '')) {
    const resolved = resolveSpecifier(fromFile, specifier);
    if (resolved.file && path.resolve(resolved.file) === target) return true;
  }
  return false;
}
